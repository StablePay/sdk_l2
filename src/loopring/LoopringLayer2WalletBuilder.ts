import ethers from 'ethers';

import { Layer2WalletBuilder } from '../Layer2WalletBuilder';
import { Layer2Wallet } from '../Layer2Wallet';
import { Network } from '../types';
import { LoopringLayer2Wallet } from './LoopringLayer2Wallet';

export class LoopringLayer2WalletBuilder implements Layer2WalletBuilder {
  constructor(private network: Network) { }

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

      return new LoopringLayer2Wallet(this.network, ethWallet);
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

          // Instantiate L2 wallet with the ethers signers.
          return new LoopringLayer2Wallet(this.network, ethersSigner);
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
