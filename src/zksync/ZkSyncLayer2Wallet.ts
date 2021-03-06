import { ethers, BigNumber } from 'ethers';
import { EventEmitter } from 'events';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';

import { ZkSyncResult } from './ZkSyncResult';

import { Deposit, Transfer, Withdrawal, Operation } from '../Operation';
import { Layer2Wallet } from '../Layer2Wallet';
import AccountStream from '../AccountStream';

// TYPES
import {
  AccountBalanceState,
  Result,
  AccountBalances,
  Network,
  BigNumberish,
} from '../types';

export class ZkSyncLayer2Wallet implements Layer2Wallet {
  private isSigningWallet: boolean = false;
  private accountStream: AccountStream;

  constructor(
    private network: Network,
    private syncWallet: ZkSyncWallet,
    private ethersSigner: ethers.Signer,
    private syncProvider: ZkSyncProvider
  ) {
    this.accountStream = new AccountStream(this);
  }

  getNetwork(): Network {
    return this.network;
  }

  getAddress(): string {
    return this.syncWallet.address();
  }

  async getBalance(): Promise<BigNumberish> {
    return this.syncWallet.getBalance('ETH');
  }
  async getBalanceVerified(): Promise<BigNumberish> {
    return this.syncWallet.getBalance('ETH', 'verified');
  }

  async getTokenBalance(tokenSymbol: string): Promise<BigNumberish> {
    return this.syncWallet.getBalance(tokenSymbol);
  }
  async getTokenBalanceVerified(tokenSymbol: string): Promise<BigNumberish> {
    return this.syncWallet.getBalance(tokenSymbol, 'verified');
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

    const {
      depositing,
      verified,
      committed,
    } = await this.syncWallet.getAccountState();

    const tokens = Object.keys(depositing.balances).concat(
      Object.keys(verified.balances),
      Object.keys(committed.balances)
    );

    const accountBalances = tokens.reduce((balances, token) => {
      return {
        ...balances,
        [token]: {
          [AccountBalanceState.Pending]: BigNumber.from(
            depositing.balances[token]?.amount ?? 0
          ),
          [AccountBalanceState.Verified]: BigNumber.from(
            verified.balances[token] ?? 0
          ),
          [AccountBalanceState.Committed]: BigNumber.from(
            committed.balances[token] ?? 0
          ),
        },
      };
    }, {});

    return accountBalances;
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
      amount: this.syncProvider.tokenSet.parseToken(
        deposit.tokenSymbol,
        deposit.amount
      ),
      approveDepositAmountForERC20: deposit.approveForErc20,
    });

    return new ZkSyncResult(zkSyncDeposit, deposit);
  }

  async transfer(transfer: Transfer): Promise<Result> {
    const zksync = await import('zksync');

    // Adjust transaction amount.
    const amount = zksync.utils.closestPackableTransactionAmount(
      this.syncProvider.tokenSet.parseToken(
        transfer.tokenSymbol,
        transfer.amount
      )
    );

    // Adjust fee amount.
    const fee = zksync.utils.closestPackableTransactionFee(
      this.syncProvider.tokenSet.parseToken(transfer.tokenSymbol, transfer.fee)
    );

    // Create operation data.
    const zkSyncOperationData = {
      to: transfer.toAddress,
      token: transfer.tokenSymbol,
      amount,
      fee,
    };

    const operationFn = () => {
      return this.syncWallet.syncTransfer(zkSyncOperationData);
    };

    return this.doOperation(operationFn, transfer);
  }

  async withdraw(withdrawal: Withdrawal): Promise<Result> {
    const zksync = await import('zksync');

    // Adjust transaction amount.
    const amount = this.syncProvider.tokenSet.parseToken(
      withdrawal.tokenSymbol,
      withdrawal.amount
    );

    // Adjust fee amount.
    const fee = zksync.utils.closestPackableTransactionFee(
      this.syncProvider.tokenSet.parseToken(
        withdrawal.tokenSymbol,
        withdrawal.fee
      )
    );

    // Create operation data.
    const zkSyncOperationData = {
      ethAddress: withdrawal.toAddress,
      token: withdrawal.tokenSymbol,
      amount,
      fee,
    };

    const operationFn = () => {
      return this.syncWallet.withdrawFromSyncToEthereum(zkSyncOperationData);
    };

    return this.doOperation(operationFn, withdrawal);
  }

  async getAccountEvents(): Promise<EventEmitter> {
    if (!this.accountStream.active) {
      // init cache
      await this.accountStream.start();
    }

    return this.accountStream.getAccountEvents();
  }

  private async doOperation(operationFn: () => {}, operation: Operation) {
    let operationResult: any;
    try {
      // Check signing wallet upgrade.
      if (!this.isSigningWallet) {
        await this.upgradeToSigningWallet();
      }

      // Make sure the account is not locked. Note that if unlocking is needed,
      // it will charge a fee for the "unlocking" transaction.
      // TODO: The zkSync team announced that they will remove this thing of
      // "locked" accounts. Therefore, remove this when that is confirmed.
      await this.unlockAccountIfNeeded(operation);

      // Invoke wrapper zkSync operation.
      operationResult = await operationFn();
    } catch (err) {
      // Detect if the exception was caused by locked account error.
      if (!this.isAccountLockedError(err)) {
        // The exception cause is NOT due to locked account state. Therefore,
        // re-throw exception as it would have been done.
        throw err;
      }

      // Log a warning since there was an attempt to unlock the account but
      // still, the error is account locked.
      console.warn('Received account locked error from zkSync');
      throw err;
    }

    return new ZkSyncResult(operationResult, operation);
  }

  private isAccountLockedError(err: any) {
    const msg: string = err.message.toUpperCase();
    const result = msg.includes('ACCOUNT') && msg.includes('LOCKED');
    return result;
  }

  private async unlockAccountIfNeeded(operation: Operation) {
    if (await this.syncWallet.isSigningKeySet()) {
      // Already unlocked. Nothing else to do.
      return;
    }

    // Proceed to unlock account.
    if ((await this.syncWallet.getAccountId()) === undefined) {
      throw new Error('Unknown account');
    }

    // Generate set signing key tx.
    const changePubKey = await this.syncWallet.setSigningKey({
      feeToken: operation.tokenSymbol,
      ethAuthType: 'ECDSA',
    });

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
