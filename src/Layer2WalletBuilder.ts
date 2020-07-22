import { Layer2Wallet } from './Layer2Wallet';

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
   * Build a new layer-2 wallet instance using Layer2 Provider-specific
   * options.
   *
   * @remarks
   * Consult provider's documentation to learn about its specifc options.
   *
   * @param signer Signer object.
   * @returns Promise with the resulting layer-2 wallet.
   */
  fromOptions(options: object): Promise<Layer2Wallet>;
}
