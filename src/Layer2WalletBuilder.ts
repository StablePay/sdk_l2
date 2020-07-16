import { Layer2Wallet } from './Layer2Wallet';
import { EthSigner } from './EthSigner';

export interface Layer2WalletBuilder {
  /**
   * Build a new layer-2 wallet instance using user-provided mnemonics as a
   * source for signing.
   *
   * @param words Menomic words separated with spaces.
   * @returns Promise with the resulting layer-2 wallet.
   */
  fromMnemonic(words: string): Promise<Layer2Wallet>;

  /**
   * Build a new layer-s wallet instance using a 'signer' object that is
   * capable of signing ETH transactions and messages.
   *
   * @param signer Signer object.
   * @returns Promise with the resulting layer-2 wallet.
   */
  fromEthSigner(signer: EthSigner): Promise<Layer2Wallet>;
}
