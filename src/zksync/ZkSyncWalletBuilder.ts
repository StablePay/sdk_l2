import { WalletBuilder } from '../WalletBuilder';
import { Wallet } from '../Wallet';
import * as zksync from 'zksync';
import ethers from 'ethers';
import { Network } from '../types';
import { ZkSyncWallet } from './ZkSyncWallet';

export class ZkSyncWalletBuilder implements WalletBuilder {
  constructor(
    private network: Network,
    private syncProvider: zksync.Provider
  ) {}

  fromMnemonic(words: string): Promise<Wallet> {
    return new Promise((resolve, reject) => {
      const ethersProvider = ethers.getDefaultProvider(this.network);

      const ethWallet = ethers.Wallet.fromMnemonic(words).connect(
        ethersProvider
      );

      zksync.Wallet.fromEthSigner(ethWallet, this.syncProvider)
        .then((syncWallet: zksync.Wallet) => {
          resolve(new ZkSyncWallet(syncWallet));
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }
}
