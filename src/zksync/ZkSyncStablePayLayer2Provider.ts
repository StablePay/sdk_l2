import { StablePayLayer2Provider } from 'StablePayLayer2Provider';
import * as zksync from 'zksync';
import { Layer2Type, Receipt, Network } from '../types';
import { ZkSyncLayer2WalletBuilder } from './ZkSyncLayer2WalletBuilder';
import { Layer2WalletBuilder } from 'Layer2WalletBuilder';

export async function getZkSyncProvider(
  network: Network
): Promise<StablePayLayer2Provider> {
  return ZkSyncStablePayLayer2Provider.newInstance(network);
}

class ZkSyncStablePayLayer2Provider implements StablePayLayer2Provider {
  private walletBuilder: Layer2WalletBuilder;

  private constructor(
    private network: Network,
    private syncProvider: zksync.Provider
  ) {
    this.walletBuilder = new ZkSyncLayer2WalletBuilder(
      this.network,
      this.syncProvider
    );
  }

  public static async newInstance(
    network: Network
  ): Promise<StablePayLayer2Provider> {
    return new Promise((resolve, reject) => {
      zksync
        .getDefaultProvider(network)
        .then((syncProvider: zksync.Provider) => {
          resolve(new ZkSyncStablePayLayer2Provider(network, syncProvider));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  getName(): string {
    return ZkSyncStablePayLayer2Provider.name;
  }
  getDescription(): string {
    return 'Layer 2 provider for zkSync by StablePay';
  }

  getWalletBuilder(): Layer2WalletBuilder {
    return this.walletBuilder;
  }

  getSupportedLayer2Type(): Layer2Type {
    return Layer2Type.ZK_SYNC;
  }
  getSupportedTokens(): Set<string> {
    throw new Error('Method not implemented.');
  }

  getWithdrawalFee(toAddress: string, tokenSymbol: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  getTransferFee(toAddress: string, tokenSymbol: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }
  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }
}
