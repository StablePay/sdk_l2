import { ZkSyncResult } from './ZkSyncResult';
import { Layer2Type, Receipt, Result, Network } from '../types';
import { Deposit, Transfer, Withdrawal } from '../Operation';
import { Layer2Wallet } from '../Layer2Wallet';
import { AccountStream } from '../AccountStream';

import * as zksync from 'zksync';
import ethers from 'ethers';

export class ZkSyncLayer2Wallet implements Layer2Wallet {
  constructor(private syncWallet: zksync.Wallet) {}

  getAddress(): string {
    throw new Error('Method not implemented.');
  }

  getTokenBalances(): Promise<[[string, string, boolean]]> {
    throw new Error('Method not implemented.');
  }
  getTokenBalance(tokenSymbol: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  getTokenBalanceVerified(tokenSymbol: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async deposit(deposit: Deposit): Promise<Result> {
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
    const zkSyncTransfer = await this.syncWallet.syncTransfer({
      amount: ethers.utils.parseEther(transfer.amount),
      to: transfer.toAddress,
      token: transfer.tokenSymbol,
      fee: transfer.fee,
    });
    return new ZkSyncResult(zkSyncTransfer, transfer);
  }

  async withdraw(withdrawal: Withdrawal): Promise<Result> {
    const zkSyncWithdrawal = await this.syncWallet.withdrawFromSyncToEthereum({
      amount: ethers.utils.parseEther(withdrawal.amount),
      ethAddress: withdrawal.toAddress,
      token: withdrawal.tokenSymbol,
      fee: withdrawal.fee,
    });
    return new ZkSyncResult(zkSyncWithdrawal, withdrawal);
  }

  getAccountStream(): AccountStream {
    throw new Error('Method not implemented.');
  }
}
