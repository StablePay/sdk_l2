import { Receipt } from './types';

export interface AccountStream {
  onEvent(cb: (receipt: Receipt) => void): void;
}
