import { Layer2Provider } from 'Layer2Provider';
import { Layer2Type, Receipt, Network } from '../types';
import { ZkSyncLayer2WalletBuilder } from './ZkSyncLayer2WalletBuilder';
import { Layer2WalletBuilder } from 'Layer2WalletBuilder';

import { ethers } from 'ethers';

export async function getZkSyncProvider(
  network: 'localhost' | 'rinkeby' | 'ropsten' | 'mainnet'
): Promise<Layer2Provider> {
  return ZkSyncLayer2Provider.newInstance(network);
}

class ZkSyncLayer2Provider implements Layer2Provider {
  private walletBuilder: Layer2WalletBuilder;

  private constructor(
    private network: Network,
    // TODO private syncProvider: zksync.Provider
    private syncProvider: any
  ) {
    this.walletBuilder = new ZkSyncLayer2WalletBuilder(
      this.network,
      this.syncProvider
    );
  }

  public static async newInstance(
    network: 'localhost' | 'rinkeby' | 'ropsten' | 'mainnet'
  ): Promise<Layer2Provider> {
    // Asynchronously load zksync library.
    const zksync = await import('zksync');
    // Create promise for new instance.
    return new Promise((resolve, reject) => {
      zksync
        .getDefaultProvider(network, 'HTTP')
        .then((syncProvider: any /* TODO zksync.Provider*/) => {
          resolve(new ZkSyncLayer2Provider(network, syncProvider));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  getName(): string {
    return ZkSyncLayer2Provider.name;
  }

  getDescription(): string {
    return 'Layer 2 provider for zkSync by StablePay';
  }

  getNetwork(): Network {
    return this.network;
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

    // The total fee is returned as Wei. Convert to units.
    const feeInUnits = ethers.utils.formatEther(feeInfo.totalFee);

    return feeInUnits;
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

    // The total fee is returned as Wei. Convert to units.
    const feeInUnits = ethers.utils.formatEther(feeInfo.totalFee);

    return feeInUnits;
  }

  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  async disconnect() {
    if (this.syncProvider) {
      await this.syncProvider.disconnect();
    }
  }
}
