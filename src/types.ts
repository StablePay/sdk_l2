export type Network = "localhost" | "rinkeby" | "ropsten" | "mainnet";

export enum Layer2Type {
  ZK_SYNC = "ZK_SYNC",
  LOOPRING = "LRC",
}

export enum OperationType {
  Deposit = "Deposit",
  Transfer = "Transfer",
  Withdrawal = "Withdrawal",
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
  nonce?: number;
  hash?: string;
  createdAt?: string;
  failReason?: string;
  committed?: boolean;
  verified?: boolean;
  l2_data?: any;
};


export interface Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}
export interface DepositResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}

export interface TransferResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}

export interface WithdrawalResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}