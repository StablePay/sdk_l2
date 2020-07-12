import { Receipt } from "./types";

interface Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}
interface DepositResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}

interface TransferResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}

interface WithdrawalResult extends Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}
