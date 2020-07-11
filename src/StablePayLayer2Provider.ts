import { Wallet } from "Wallet";
import { AccountStream } from "AccountStream";
import { Layer2Type, Receipt, Deposit, Transfer, Withdrawal } from "types";

export interface StablePayLayer2Provider {
  getName(): string;
  getDescription(): string;
  getWallet(): Wallet;
  getSupportedLayer2Type(): Layer2Type;
  getSupportedTokens(): Set<string>;

  getTokenBalances(): Promise<[[string, string]]>;
  getTokenBalance(tokenSymbol: string): Promise<string>;
  getTokenBalanceVerified(tokenSymbol: string): Promise<string>;

  getWithdrawalFee(toAddress: string, tokenSymbol: string): Promise<string>;
  getTransferFee(toAddress: string, tokenSymbol: string): Promise<string>;

  getReceipt(txHash: string): Promise<Receipt>;

  getAccountHistory(address: string): Promise<Receipt>;

  deposit(deposit: Deposit): Promise<DepositResult>;
  transfer(transfer: Transfer): Promise<TransferResult>;
  withdraw(withdrawal: Withdrawal): Promise<WithdrawalResult>;

  getAccountStream(): AccountStream;
}
