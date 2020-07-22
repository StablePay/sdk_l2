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

  getSupportedLayer2Type(): Layer2Type {
    return Layer2Type.ZK_SYNC;
  }

  async getSupportedTokens(): Promise<Set<string>> {
    const ret = new Set<string>();

    const tokenInfoDict = await this.syncProvider.getTokens();
    for (const symbol in tokenInfoDict) {
      ret.add(symbol);
    }

    return ret;
  }

  getLayer2WalletBuilder(): Layer2WalletBuilder {
    return this.walletBuilder;
  }

  async getWithdrawalFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    // Get fee information from zkSync network. Note that zkSync provides
    // a gas fee and the zkSync proper fee. We are returning the total fee
    // here.
    const feeInfo = await this.syncProvider.getTransactionFee(
      'Withdraw',
      toAddress,
      tokenSymbol
    );

    return feeInfo.totalFee.toString();
  }
  async getTransferFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    // Get fee information from zkSync network. Note that zkSync provides
    // a gas fee and the zkSync proper fee. We are returning the total fee
    // here.
    const feeInfo = await this.syncProvider.getTransactionFee(
      'Transfer',
      toAddress,
      tokenSymbol
    );

    return feeInfo.totalFee.toString();
  }

  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }
}
