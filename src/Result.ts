import { Receipt } from './types';

export interface Result {
  getReceipt(): Promise<Receipt>;
  getReceiptVerify(): Promise<Receipt>;
}
