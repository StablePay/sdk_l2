import ethers from 'ethers';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';

import { Layer2WalletBuilder } from '../Layer2WalletBuilder';
import { Layer2Wallet } from '../Layer2Wallet';
import { Network } from '../types';
import { ZkSyncLayer2Wallet } from './ZkSyncLayer2Wallet';

export class ZkSyncLayer2WalletBuilder implements Layer2WalletBuilder {
  constructor(private network: Network, private syncProvider: ZkSyncProvider) {}

  getNetwork(): Network {
    return this.network;
  }

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

      import('zksync').then((zksync) => {
        zksync.Wallet.fromEthSignerNoKeys(ethWallet, this.syncProvider)
          .then((syncWallet: ZkSyncWallet) => {
            resolve(
              new ZkSyncLayer2Wallet(
                this.network,
                syncWallet,
                ethWallet,
                this.syncProvider
              )
            );
          })
          .catch((err: any) => {
            reject(err);
          });
      });

      // Instantiate the zkSync wallet.
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
          if (!this.sameNetwork(etherNetwork.name, this.network)) {
            reject(
              `Ethers lib signer has the wrong network ${etherNetwork.name} != ${this.network}`
            );
          }

          // All initial validations done. Proceed to instantiate the zkSync
          // wallet.
          import('zksync').then((zksync) => {
            zksync.Wallet.fromEthSignerNoKeys(ethersSigner, this.syncProvider)
              .then((syncWallet: ZkSyncWallet) => {
                resolve(
                  new ZkSyncLayer2Wallet(
                    this.network,
                    syncWallet,
                    ethersSigner,
                    this.syncProvider
                  )
                );
              })
              .catch((err) => {
                reject(err);
              });
          });
        })
        .catch((err) => reject(err));
    });
  }

  private sameNetwork(a: string, b: string): boolean {
    const mainnets = ['mainnet', 'homestead'];
    if (mainnets.includes(a) && mainnets.includes(b)) {
      return true;
    }
    return a === b;
  }
}
