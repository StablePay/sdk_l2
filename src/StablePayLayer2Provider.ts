import { WalletBuilder } from 'WalletBuilder';
import { Layer2Type, Receipt } from 'types';

export interface StablePayLayer2Provider {
  /**
   * Get the name of the layer-2 provider instance.
   *
   * @returns name of the layer-2 provider instance.
   */
  getName(): string;

  /**
   * Get a description of the layer-2 provider instance.
   *
   * @returns Description of the layer-2 provider instance.
   */
  getDescription(): string;

  /**
   * Get a wallet builder specific for the current layer-2 provider instance.
   *
   * @returns Wallet builder for this layer-2 provider instance.
   */
  getWalletBuilder(): WalletBuilder;

  /**
   * Get the layer-2 vendor that this layer-2 provider instance supports.
   *
   * @returns Layer-2 vendor that this layer-2 provider instance supports.
   */
  getSupportedLayer2Type(): Layer2Type;

  /**
   * Get a collection of the supported tokens that the layer-2 vendor supports
   * for transactions or operations.
   *
   * @returns Collection of the supported tokens that this layer-2 provider
   * supports.
   */
  getSupportedTokens(): Set<string>;

  /**
   * Obtain de network-suggested fee to carry out a Withdrawal operation given
   * the token symbol and the intended destination address.
   *
   * @remarks
   * The destination address may or may not be optional depending on the
   * layer-2 network. Error will be raised if such parameter is required and
   * not provided.
   *
   * @param tokenSymbol Token whose network fee wants to be known.
   * @param toAddress Optional. The intended destination address.
   * @returns The network-suggested fee in the specified token's quantity.
   * @throws Error if _toAddress_ is required by the vendor but not was not
   * provided.
   */
  getWithdrawalFee(tokenSymbol: string, toAddress?: string): Promise<string>;

  /**
   * Obtain de network-suggested fee to carry out a Transfer operation given
   * the token symbol and the intended destination address.
   *
   * @remarks
   * The destination address may or may not be optional depending on the
   * layer-2 network. Error will be raised if such parameter is required and
   * not provided.
   *
   * @param tokenSymbol Token whose network fee wants to be known.
   * @param toAddress Optional. The intended destination address.
   * @returns The network-suggested fee in the specified token's quantity.
   * @throws Error if _toAddress_ is required by the vendor but not was not
   * provided.
   */
  getTransferFee(tokenSymbol: string, toAddress: string): Promise<string>;

  getReceipt(txHash: string): Promise<Receipt>;

  getAccountHistory(address: string): Promise<Receipt>;
}
