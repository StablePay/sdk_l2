import * as zksync from "zksync";
import { ZkSyncDepositResult } from "../src/zksync/ZkSyncResult";
import { OperationType, Deposit } from "../src/types";

test("depositResult", async () => {
  const fakeDepositResultHolder: any = {
    awaitReceiptVerify: () => {
      return new Promise<zksync.types.PriorityOperationReceipt>((resolve) => {
        resolve({
          executed: true,
          block: {
            blockNumber: 666,
            committed: true,
            verified: true,
          },
        });
      });
    },
  };
  const fakeDeposit = Deposit.createDeposit({
    toAddress: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    amount: "666.777",
    fee: "0.01",
  });
  const fakeDepositResult = new ZkSyncDepositResult(
    fakeDepositResultHolder,
    fakeDeposit
  );

  // Method under test.
  const receipt = await fakeDepositResult.getReceiptVerify();

  // Expectations.
  expect(receipt.operationType).toBe(OperationType.Deposit);
  expect(receipt.blockNumber).toBe(666);
  expect(receipt.tokenSymbol).toBe("ETH");
  expect(receipt.committed).toBeTruthy();
  expect(receipt.verified).toBeTruthy();
});
