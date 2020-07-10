enum Layer2Type {
  ZK_SYNC = "ZK_SYNC",
  LOOPRING = "LRC",
}

enum OperationType {
  Deposit = "Deposit",
  Transfer = "Transfer",
  Withdrawal = "Withdrawal",
}

type Operation = {
  toAddress: string;
  amount: string;
  fee: string;
};

type Deposit = Operation & {
  tokenSymbol: "ETH";
  type: OperationType.Deposit;
};
type Transfer = Operation & {
  tokenSymbol: "ETH";
  type: OperationType.Transfer;
};
type Withdrawal = Operation & {
  tokenSymbol: "ETH";
  type: OperationType.Withdrawal;
};

type TokenDeposit = Deposit & {
  tokenSymbol: string;
  approveForErc20: boolean;
};

type TokenTransfer = Transfer & {
  tokenSymbol: string;
};

type TokenWithdrawal = Withdrawal & {
  tokenSymbol: string;
};

type Receipt = {
  operationType: any;
  from: string;
  to: string;
  tokenSymbol: string; // ETH in case of no token
  amount: string;
  fee: string;
  blockNumber: number;
  nonce: number;
  hash: string;
  createdAt: string;
  failReason?: string;
  committed: boolean;
  verified: boolean;
  l2_data?: any;
};

type DepositReceipt = Receipt & {
  operationType: OperationType.Deposit;
};

type TransferReceipt = Receipt & {
  operationType: OperationType.Transfer;
};

type WithdrawalReceipt = Receipt & {
  operationType: OperationType.Withdrawal;
};
