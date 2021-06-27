import {
  OperationType,
  OperationProps,
  GeneralProps,
  DepositProps,
} from './types';

export abstract class Operation {
  public readonly type: OperationType;
  public readonly toAddress: string;
  public readonly amount: string;
  public readonly fee: string;
  public readonly tokenSymbol: string;
  public readonly approveForErc20: boolean;

  constructor({
    type,
    toAddress,
    amount,
    fee,
    tokenSymbol,
    approveForErc20,
  }: OperationProps) {
    this.type = type;
    this.toAddress = toAddress;
    this.amount = amount;
    this.fee = fee;
    this.tokenSymbol = tokenSymbol;
    this.approveForErc20 = !!approveForErc20;
  }
}

export class Deposit extends Operation {
  public static createDeposit(props: {
    toAddress: string;
    amount: string;
    fee: string;
  }) {
    return new Deposit({
      ...props,
      tokenSymbol: 'ETH',
      approveForErc20: false,
    });
  }
  public static createTokenDeposit(props: DepositProps) {
    return new Deposit({ ...props });
  }
  private constructor(props: DepositProps) {
    super({ ...props, type: OperationType.Deposit });
  }
}

export class Transfer extends Operation {
  constructor(props: GeneralProps) {
    super({ ...props, type: OperationType.Transfer });
  }
}
export class Withdrawal extends Operation {
  constructor(props: GeneralProps) {
    super({ ...props, type: OperationType.Withdrawal });
  }
}
