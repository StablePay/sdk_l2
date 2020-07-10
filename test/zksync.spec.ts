import { ZkSyncDepositResult } from "../src/zksync/ZkSyncResult";

test("depositResult", () => {
  const resultHolder: any = 2;
  const dr = new ZkSyncDepositResult(resultHolder);
  expect(dr !== null);
});
