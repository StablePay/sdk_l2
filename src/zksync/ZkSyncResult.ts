import * as zksync from "zksync";
import { Deposit, Receipt, OperationType } from "../types";

export class ZkSyncDepositResult implements DepositResult {
  // This result holder has to be of type 'any' since the corresponding
  // class from zkSync is not exported. (class ETHOperation from wallet.ts)
  private zkSyncDepositResultHolder: any;
  private deposit: Deposit;

  constructor(depositResultHolder: any, deposit: Deposit) {
    this.zkSyncDepositResultHolder = depositResultHolder;
    this.deposit = deposit;
  }

  getReceipt(): Promise<Receipt> {
    return this.getReceiptInternal(false);
  }

  getReceiptVerify(): Promise<Receipt> {
    return this.getReceiptInternal(true);
  }

  async getReceiptInternal(doVerify: boolean): Promise<Receipt> {
    const zkSyncDepositReceipt: zksync.types.PriorityOperationReceipt = doVerify
      ? await this.zkSyncDepositResultHolder.awaitReceiptVerify()
      : await this.zkSyncDepositResultHolder.awaitReceipt();
    const result: Receipt = {
      to: this.deposit.toAddress,
      tokenSymbol: this.deposit.tokenSymbol, // ETH in case of no token
      amount: this.deposit.amount,
      fee: this.deposit.fee,
      blockNumber: zkSyncDepositReceipt.block?.blockNumber,
      committed: zkSyncDepositReceipt.block?.committed,
      verified: zkSyncDepositReceipt.block?.verified,
      operationType: OperationType.Deposit,
    };

    return result;
  }
}
