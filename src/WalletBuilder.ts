import { Wallet } from './Wallet';

export interface WalletBuilder {
  fromMnemonic(words: string): Promise<Wallet>;
}
