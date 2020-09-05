import { Receipt, Result } from '../types';
import { Operation } from '../Operation';

import * as zksync from 'zksync';

const ZK_SYNC_TX_HASH_PREFIX = 'sync-tx:';

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
    // Obtain zkSync transaction receipt either verified or not verified.
    const zkSyncReceipt: zksync.types.PriorityOperationReceipt = doVerify
      ? await this.resultHolder.awaitReceiptVerify()
      : await this.resultHolder.awaitReceipt();

    // Obtain transaction hash from result object. Remove zkSync transaction
    // prefix.
    const txHash =
      this.resultHolder.txHash &&
      this.resultHolder.txHash.startsWith(ZK_SYNC_TX_HASH_PREFIX)
        ? this.resultHolder.txHash.slice(ZK_SYNC_TX_HASH_PREFIX.length)
        : this.resultHolder.txHash;

    // Create transaction receipt.
    const result: Receipt = {
      hash: txHash,
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
