export type Network =
  | 'localhost'
  | 'rinkeby'
  | 'ropsten'
  | 'homestead'
  | 'mainnet';

export enum Layer2Type {
  ZK_SYNC = 'ZK_SYNC',
  LOOPRING = 'LRC',
}

export enum AccountBalanceState {
  Pending = 'pending',
  Committed = 'committed',
  Verified = 'verified',
}

export enum OperationType {
  Deposit = 'Deposit',
  Transfer = 'Transfer',
  Withdrawal = 'Withdrawal',
}

export type GeneralProps = {
  toAddress: string;
  amount: string;
  fee: string;
  tokenSymbol: string;
};

export type DepositProps = GeneralProps & {
  approveForErc20: boolean;
};

export type OperationProps = GeneralProps & {
  type: OperationType;
};

export type Receipt = {
  operationType: OperationType;
  from?: string;
  to: string;
  tokenSymbol: string; // ETH in case of no token
  amount: string;
  fee: string;
  blockNumber?: number;
  hash?: string;
  createdAt?: string;
  failReason?: string;
  committed?: boolean;
  verified?: boolean;
};

export interface Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}

export type TokenBalance = {
  symbol: string;
  balance: string;
  state: string;
};

export type AccountBalances = {
  [symbol: string]: TokenBalance;
};
