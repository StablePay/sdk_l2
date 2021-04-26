import { ethers, BigNumber } from 'ethers';
import { EventEmitter } from 'events';

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

export class LoopringLayer2Wallet implements Layer2Wallet {
  private accountStream: AccountStream;

  constructor(
    private network: Network,
    private ethersSigner: ethers.Signer,
  ) {
    this.accountStream = new AccountStream(this);
  }

  getNetwork(): Network {
    return this.network;
  }

  getAddress(): string {
    throw new Error('Not implemented')
  }

  async getBalance(): Promise<BigNumberish> {
    throw new Error('Not implemented')
  }
  async getBalanceVerified(): Promise<BigNumberish> {
    throw new Error('Not implemented')
  }

  async getTokenBalance(tokenSymbol: string): Promise<BigNumberish> {
    throw new Error('Not implemented')
  }
  async getTokenBalanceVerified(tokenSymbol: string): Promise<BigNumberish> {
    throw new Error('Not implemented')
  }

  // TODO: deprecate to use getAccountTokenBalances or refactor to use getAccountTokenBalances impl
  async getAccountBalances(): Promise<[string, string, AccountBalanceState][]> {
    throw new Error('Not implemented')
  }

  async getAccountTokenBalances(): Promise<AccountBalances> {
    throw new Error('Not implemented')
  }

  async deposit(deposit: Deposit): Promise<Result> {
    throw new Error('Not implemented')
  }

  async transfer(transfer: Transfer): Promise<Result> {
    throw new Error('Not implemented')
  }

  async withdraw(withdrawal: Withdrawal): Promise<Result> {
    throw new Error('Not implemented')
  }

  async getAccountEvents(): Promise<EventEmitter> {
    throw new Error('Not implemented')
  }
}
