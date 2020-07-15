import { StablePayLayer2Provider } from 'StablePayLayer2Provider';
import { Layer2Type, Network } from './types';
import { getZkSyncProvider } from './zksync/ZkSyncStablePayLayer2Provider';

export class StablePayLayer2Manager {
  private readonly providerInstaces: Map<string, StablePayLayer2Provider>;
  public static readonly Instance = new StablePayLayer2Manager();

  private constructor() {
    this.providerInstaces = new Map<string, StablePayLayer2Provider>();
  }

  getBalance(layer2Type: Layer2Type, tokenSymbol: string): string {
    throw new Error('Method not implemented.');
  }
  getBalanceVerified(layer2Type: Layer2Type, tokenSymbol: string): string {
    throw new Error('Method not implemented.');
  }

  /**
   * Get a layer-2 provider for the specified layer-2 supported vendor and
   * network (ropsten, rinkeby, mainnet, etc.)
   *
   * @remarks
   * Not all layer-2 vendor and network combinations maybe supported.
   *
   * @param layer2Type - enum containing the desired layer-2 vendor.
   * @param network - network to work with.
   * @returns Promise with the layer-2 provider for vendor and network.
   *
   * @throws Error if not settings not supported.
   *
   * @beta
   */
  async getProviderByLayer2Type(
    layer2Type: Layer2Type,
    network: Network
  ): Promise<StablePayLayer2Provider> {
    const key = `${layer2Type}:${network}`;
    try {
      switch (layer2Type) {
        case Layer2Type.ZK_SYNC:
          if (!this.providerInstaces.has(key)) {
            const newProvider = await getZkSyncProvider(network);
            this.providerInstaces.set(key, newProvider);
          }
          return this.providerInstaces.get(key)!;
      }
    } catch (err) {
      console.log(err);
      throw new Error('Error encountered while creating provider instance');
    }

    throw new Error('Unsupported provider');
  }

  /**
   * Get a set of the supported layer-2 supported vendors.
   *
   * @returns Set with the supported layer-2 vendors
   *
   * @beta
   */
  getSupportedLayer2Types(): Set<Layer2Type> {
    return new Set([Layer2Type.ZK_SYNC]);
  }
}
