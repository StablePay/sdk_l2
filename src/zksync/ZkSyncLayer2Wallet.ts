import { ethers } from 'ethers';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';

import { ZkSyncResult } from './ZkSyncResult';
import { AccountBalanceState, Result, AccountBalances } from '../types';
import { Deposit, Transfer, Withdrawal } from '../Operation';
import { Layer2Wallet } from '../Layer2Wallet';
import { AccountStream } from '../AccountStream';

export class ZkSyncLayer2Wallet implements Layer2Wallet {
  private isSigningWallet: boolean = false;

  constructor(
    private syncWallet: ZkSyncWallet,
    private ethersSigner: ethers.Signer,
    private syncProvider: ZkSyncProvider
  ) {}

  getAddress(): string {
    return this.syncWallet.address();
  }

  async getBalance(): Promise<string> {
    return (await this.syncWallet.getBalance('ETH')).toString();
  }
  async getBalanceVerified(): Promise<string> {
    return (await this.syncWallet.getBalance('ETH', 'verified')).toString();
  }

  async getTokenBalance(tokenSymbol: string): Promise<string> {
    return (await this.syncWallet.getBalance(tokenSymbol)).toString();
  }
  async getTokenBalanceVerified(tokenSymbol: string): Promise<string> {
    return (
      await this.syncWallet.getBalance(tokenSymbol, 'verified')
    ).toString();
  }

  // TODO: deprecate to use getAccountTokenBalances or refactor to use getAccountTokenBalances impl
  async getAccountBalances(): Promise<[string, string, AccountBalanceState][]> {
    const ret: [string, string, AccountBalanceState][] = [];

    const accountState = await this.syncWallet.getAccountState();
    const balanceDicts: [any, AccountBalanceState][] = [
      [accountState.verified, AccountBalanceState.Verified],
      [accountState.committed, AccountBalanceState.Committed],
      [accountState.depositing, AccountBalanceState.Pending],
    ];

    for (const [balanceDict, balanceState] of balanceDicts) {
      for (const tokenSymbol in balanceDict.balances) {
        ret.push([
          tokenSymbol,
          accountState.verified.balances[tokenSymbol].toString(),
          balanceState,
        ]);
      }
    }
    return ret;
  }

  async getAccountTokenBalances(): Promise<AccountBalances> {
    const ret: AccountBalances = {};

    const accountState = await this.syncWallet.getAccountState();
    const balanceDicts: [any, AccountBalanceState][] = [
      [accountState.verified, AccountBalanceState.Verified],
      [accountState.committed, AccountBalanceState.Committed],
      [accountState.depositing, AccountBalanceState.Pending],
    ];

    for (const [balanceDict, balanceState] of balanceDicts) {
      for (const tokenSymbol in balanceDict.balances) {
        if (balanceDict.balances.hasOwnProperty(tokenSymbol)) {
          ret[tokenSymbol] = {
            symbol: tokenSymbol,
            balance: accountState.verified.balances[tokenSymbol].toString(),
            state: balanceState,
          };
        }
      }
    }
    return ret;
  }

  async deposit(deposit: Deposit): Promise<Result> {
    // Check signing wallet upgrade.
    if (!this.isSigningWallet) {
      await this.upgradeToSigningWallet();
    }
    // The result of depositToSyncFromEthereum is of a class "ETHOperation".
    // Such class is not exported. Need to use 'any' here.
    const zkSyncDeposit = await this.syncWallet.depositToSyncFromEthereum({
      depositTo: this.syncWallet.address(),
      token: deposit.tokenSymbol,
      amount: ethers.utils.parseEther(deposit.amount),
    });
    return new ZkSyncResult(zkSyncDeposit, deposit);
  }

  async transfer(transfer: Transfer): Promise<Result> {
    const zksync = await import('zksync');

    // Get amount and fee.
    const amount = zksync.utils.closestPackableTransactionAmount(
      ethers.utils.parseEther(transfer.amount)
    );
    const fee = zksync.utils.closestPackableTransactionFee(
      ethers.utils.parseEther(transfer.fee)
    );

    // Create operation data.
    const zkSyncOperationData = {
      to: transfer.toAddress,
      token: transfer.tokenSymbol,
      amount,
      fee,
    };

    let zkSyncTransfer: any;
    try {
      // Check signing wallet upgrade.
      if (!this.isSigningWallet) {
        await this.upgradeToSigningWallet();
      }
      // Perform TRANSFER operation.
      zkSyncTransfer = await this.syncWallet.syncTransfer(zkSyncOperationData);
    } catch (err) {
      // Detect if the exception was caused by trying to transfer from a
      // locked account.
      if (!this.isAccountLockedError(err)) {
        // The exception cause is NOT due to locked account state. Therefore,
        // re-throw exception as it would have been done.
        throw err;
      }
      // Cause for exception is that the account is locked. This will always
      // happen the first time a tx is attempted.
      try {
        // Attempt to unlock account.
        await this.unlockAccount();
        // Retry operation now that the account is unlocked.
        zkSyncTransfer = await this.syncWallet.syncTransfer(
          zkSyncOperationData
        );
      } catch (innerErr) {
        // Do nothing with this inner exception. Just log.
        // TODO decide on logging lib.
        // Throw original exception.
        throw err;
      }
    }

    return new ZkSyncResult(zkSyncTransfer, transfer);
  }

  async withdraw(withdrawal: Withdrawal): Promise<Result> {
    const zksync = await import('zksync');

    const amount = ethers.utils.parseEther(withdrawal.fee);
    const fee = zksync.utils.closestPackableTransactionFee(
      ethers.utils.parseEther(withdrawal.fee)
    );

    // Create operation data.
    const zkSyncOperationData = {
      ethAddress: withdrawal.toAddress,
      token: withdrawal.tokenSymbol,
      amount,
      fee,
    };

    let zkSyncWithdrawal: any;
    try {
      // Check signing wallet upgrade.
      if (!this.isSigningWallet) {
        await this.upgradeToSigningWallet();
      }
      // Perform WITHDRAW operation.
      zkSyncWithdrawal = await this.syncWallet.withdrawFromSyncToEthereum(
        zkSyncOperationData
      );
    } catch (err) {
      // Detect if the exception was caused by trying to transfer from a
      // locked account.
      if (!this.isAccountLockedError(err)) {
        // The exception cause is NOT due to locked account state. Therefore,
        // re-throw exception as it would have been done.
        throw err;
      }
      // Cause for exception is that the account is locked. This will always
      // happen the first time a tx is attempted.
      try {
        // Attempt to unlock account.
        await this.unlockAccount();
        // Retry operation now that the account is unlocked.
        zkSyncWithdrawal = await this.syncWallet.withdrawFromSyncToEthereum(
          zkSyncOperationData
        );
      } catch (innerErr) {
        // Do nothing with this inner exception. Just log.
        // TODO decide on logging lib.
        // Throw original exception.
        throw err;
      }
    }

    return new ZkSyncResult(zkSyncWithdrawal, withdrawal);
  }

  getAccountStream(): AccountStream {
    throw new Error('Method not implemented.');
  }

  private isAccountLockedError(err: any) {
    const msg: string = err.message.toUpperCase();
    const result = msg.includes('ACCOUNT') && msg.includes('LOCKED');
    return result;
  }

  private async unlockAccount() {
    if (await this.syncWallet.isSigningKeySet()) {
      // Already unlocked. Nothing else to do.
      return;
    }

    // Proceed to unlock account.
    if ((await this.syncWallet.getAccountId()) === undefined) {
      throw new Error('Unknown account');
    }

    // Generate set signing key tx.
    const changePubKey = await this.syncWallet.setSigningKey();

    // Wait until the tx is committed.
    await changePubKey.awaitReceipt();
  }

  private async upgradeToSigningWallet() {
    if (this.isSigningWallet) {
      // Wallet already upgraded. Nothing to do.
      return;
    }

    const zksync = await import('zksync');

    // Upgrade wallet.
    this.syncWallet = await zksync.Wallet.fromEthSigner(
      this.ethersSigner,
      this.syncProvider
    );

    // Declare this wallet as a signing-able one.
    this.isSigningWallet = true;
  }
}
