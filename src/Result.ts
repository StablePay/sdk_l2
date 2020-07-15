import { Receipt } from './types';

interface Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}
