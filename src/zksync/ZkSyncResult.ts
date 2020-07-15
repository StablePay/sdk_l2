import * as zksync from 'zksync';
import { Receipt, Result } from '../types';
import { Operation } from '../Operation';

export class ZkSyncResult implements Result {
  // This result holder has to be of type 'any' since the corresponding
  // class from zkSync is not exported. (class ETHOperation from wallet.ts)
  constructor(private resultHolder: any, private operation: Operation) {}

  getReceipt(): Promise<Receipt> {
    return this.getReceiptInternal(false);
  }

  getReceiptVerify(): Promise<Receipt> {
    return this.getReceiptInternal(true);
  }

  private async getReceiptInternal(doVerify: boolean): Promise<Receipt> {
    const zkSyncReceipt: zksync.types.PriorityOperationReceipt = doVerify
      ? await this.resultHolder.awaitReceiptVerify()
      : await this.resultHolder.awaitReceipt();
    const result: Receipt = {
      to: this.operation.toAddress,
      tokenSymbol: this.operation.tokenSymbol, // ETH in case of no token
      amount: this.operation.amount,
      fee: this.operation.fee,
      blockNumber: zkSyncReceipt.block?.blockNumber,
      committed: zkSyncReceipt.block?.committed,
      verified: zkSyncReceipt.block?.verified,
      operationType: this.operation.type,
    };

    return result;
  }
}
