import { Layer2WalletBuilder } from '../Layer2WalletBuilder';
import { Layer2Wallet } from '../Layer2Wallet';
import { Network } from '../types';
import { ZkSyncLayer2Wallet } from './ZkSyncLayer2Wallet';

import * as zksync from 'zksync';
import ethers from 'ethers';

export class ZkSyncLayer2WalletBuilder implements Layer2WalletBuilder {
  constructor(
    private network: Network,
    private syncProvider: zksync.Provider
  ) {}

  fromMnemonic(words: string): Promise<Layer2Wallet> {
    return new Promise((resolve, reject) => {
      // TODO. Had to do this, undefined otherwise. Seek alternative.
      const ethers = require('ethers');

      // Create ethers provided bound to this wallet builder's network.
      const ethersProvider = ethers.getDefaultProvider(this.network);

      // Create an ethers wallet from the provided mnemonics.
      const ethWallet = ethers.Wallet.fromMnemonic(words).connect(
        ethersProvider
      );

      // Instantiate the zkSync wallet.
      zksync.Wallet.fromEthSigner(ethWallet, this.syncProvider)
        .then((syncWallet: zksync.Wallet) => {
          resolve(new ZkSyncLayer2Wallet(syncWallet));
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  fromOptions({
    ethersSigner,
  }: {
    [ethersSigner: string]: ethers.Signer;
  }): Promise<Layer2Wallet> {
    return new Promise((resolve, reject) => {
      // Check that the ethers signer has an assigned provider.
      if (!ethersSigner.provider) {
        throw new Error('Undefined ethers provider');
      }

      ethersSigner.provider
        .getNetwork()
        .then((etherNetwork) => {
          // Check that the signer's bound network is the same as this wallet
          // builder and layer-2 provider.
          if (etherNetwork.name != this.network) {
            reject('Ethers lib signer has the wrong network');
          }

          // All initial validations done. Proceed to instantiate the zkSync
          // wallet.
          zksync.Wallet.fromEthSigner(ethersSigner, this.syncProvider)
            .then((syncWallet: zksync.Wallet) => {
              resolve(new ZkSyncLayer2Wallet(syncWallet));
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => reject(err));
    });
  }
}
