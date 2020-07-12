import {
    OperationType,
    OperationProps,
    GeneralProps,
    DepositProps
} from './types';


export abstract class Operation {
    public readonly type: OperationType;
    public readonly toAddress: string;
    public readonly amount: string;
    public readonly fee: string;
    public readonly tokenSymbol: string;
  
    constructor({ type, toAddress, amount, fee, tokenSymbol }: OperationProps) {
      this.type = type;
      this.toAddress = toAddress;
      this.amount = amount;
      this.fee = fee;
      this.tokenSymbol = tokenSymbol;
    }
  }
  
  export class Deposit extends Operation {
    public readonly approveForErc20: boolean;
    public static createDeposit(props: {
      toAddress: string;
      amount: string;
      fee: string;
    }) {
      return new Deposit({
        ...props,
        tokenSymbol: "ETH",
        approveForErc20: false,
      });
    }
    public static createTokenDeposit(props: DepositProps) {
      return new Deposit({ ...props });
    }
    private constructor(props: DepositProps) {
      super({ ...props, type: OperationType.Deposit });
      this.approveForErc20 = props.approveForErc20;
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