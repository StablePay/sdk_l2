import { Layer2Provider } from 'Layer2Provider';
import { Layer2Type, Receipt, Network } from '../types';
import { LoopringLayer2WalletBuilder } from './LoopringLayer2WalletBuilder';
import { Layer2WalletBuilder } from 'Layer2WalletBuilder';

import { ethers } from 'ethers';

export async function getLoopringProvider(
  network: 'localhost' | 'rinkeby' | 'ropsten' | 'mainnet'
): Promise<Layer2Provider> {
  return LoopringLayer2Provider.newInstance(network);
}

class LoopringLayer2Provider implements Layer2Provider {
  private walletBuilder: Layer2WalletBuilder;

  private constructor(
    private network: Network,
  ) {
    this.walletBuilder = new LoopringLayer2WalletBuilder(this.network);
  }

  public static async newInstance(
    network: 'localhost' | 'rinkeby' | 'ropsten' | 'mainnet'
  ): Promise<Layer2Provider> {
    // Create promise for new instance.
    return new Promise((resolve, reject) => {
      resolve(new LoopringLayer2Provider(network));
    });
  }

  getName(): string {
    return LoopringLayer2Provider.name;
  }

  getDescription(): string {
    return 'Layer 2 provider for Loopring by StablePay';
  }

  getNetwork(): Network {
    return this.network;
  }

  getSupportedLayer2Type(): Layer2Type {
    return Layer2Type.LOOPRING;
  }

  async getSupportedTokens(): Promise<Set<string>> {
    throw new Error('Not implemented')
  }

  getLayer2WalletBuilder(): Layer2WalletBuilder {
    return this.walletBuilder;
  }

  async getWithdrawalFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    throw new Error('Not implemented')
  }

  async getTransferFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    throw new Error('Not implemented')
  }

  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  async disconnect() {
    throw new Error('Not implemented')
  }
}
