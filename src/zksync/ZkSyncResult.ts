import * as zksync from "zksync";

export class ZkSyncDepositResult implements DepositResult {
  private resultHolder: any;

  constructor(resultHolder: any) {
    this.resultHolder = resultHolder;
    // zksync.types.PriorityOperationReceipt;
  }

  async getReceipt(): Promise<DepositReceipt> {
    const zkSyncDepositReceipt = await this.resultHolder.awaitReceipt();
    /*
    export interface PriorityOperationReceipt {
      executed: boolean;
      block?: BlockInfo;
  }
  export interface BlockInfo {
    blockNumber: number;
    committed: boolean;
    verified: boolean;
}

  */

    throw new Error("Method not implemented.");
  }
  getReceiptVerify(): Promise<DepositReceipt> {
    throw new Error("Method not implemented.");
  }
}
