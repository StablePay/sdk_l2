import { Layer2WalletBuilder } from '../Layer2WalletBuilder';
import { Layer2Wallet } from '../Layer2Wallet';
import { EthSigner } from '../EthSigner';
import { Network } from '../types';
import { ZkSyncLayer2Wallet } from './ZkSyncWallet';

import * as zksync from 'zksync';
import ethers from 'ethers';

export class ZkSyncLayer2WalletBuilder implements Layer2WalletBuilder {
  constructor(
    private network: Network,
    private syncProvider: zksync.Provider
  ) {}
  fromMnemonic(words: string): Promise<Layer2Wallet> {
    return new Promise((resolve, reject) => {
      const ethersProvider = ethers.getDefaultProvider(this.network);

      const ethWallet = ethers.Wallet.fromMnemonic(words).connect(
        ethersProvider
      );

      zksync.Wallet.fromEthSigner(ethWallet, this.syncProvider)
        .then((syncWallet: zksync.Wallet) => {
          resolve(new ZkSyncLayer2Wallet(syncWallet));
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  fromEthSigner(signer: EthSigner): Promise<Layer2Wallet> {
    throw new Error('Method not implemented.');
  }
}
