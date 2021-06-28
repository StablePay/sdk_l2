import { ethers } from 'ethers';

import { MaticPOSClient } from '@maticnetwork/maticjs';
import { Eip1193BridgeHelper } from './Eip1193BridgeHelper';

import { Layer2WalletBuilder } from '../../Layer2WalletBuilder';
import { Layer2Wallet } from '../../Layer2Wallet';
import { Network } from '../../types';
import { PolygonMaticLayer2Provider } from './PolygonMaticLayer2Provider';
import { PolygonMaticLayer2Wallet } from './PolygonMaticLayer2Wallet';
import { PolygonMaticWalletOptions } from './types';

export class PolygonMaticLayer2WalletBuilder implements Layer2WalletBuilder {
  constructor(
    private network: Network,
    private layer2Provider: PolygonMaticLayer2Provider
  ) {
    // Constructor placeholder.
  }

  getNetwork(): Network {
    return this.network;
  }

  async fromMnemonic(words: string): Promise<Layer2Wallet> {
    // Create ethers provided bound to this wallet builder's network.
    // TODO: Create options object to pass provider settings.
    const ethersProvider = ethers.getDefaultProvider(this.network, {
      infura: process.env.TEST_INFURA_PROJECT_ID,
    });

    // Create an ethers wallet from the provided mnemonics.
    const ethWallet = ethers.Wallet.fromMnemonic(words).connect(ethersProvider);

    // Instantiate Matic SDK instance.
    const maticPOSClient: MaticPOSClient = await this.initMaticInstance(
      ethWallet
    );

    // Instantiate the layer 2 wallet.
    const layer2Wallet = PolygonMaticLayer2Wallet.newInstance(
      this.network,
      ethWallet,
      this.layer2Provider,
      maticPOSClient
    );

    return layer2Wallet;
  }

  async fromOptions(options: PolygonMaticWalletOptions): Promise<Layer2Wallet> {
    const ethersSigner = options.ethersSigner;

    // Check that the ethers signer has an assigned provider.
    if (!ethersSigner.provider) {
      throw new Error('Undefined ethers provider');
    }

    const etherNetwork = await ethersSigner.provider.getNetwork();
    if (!this.sameNetwork(etherNetwork.name, this.network)) {
      throw new Error(
        `Ethers lib signer has the wrong network ${etherNetwork.name} != ${this.network}`
      );
    }

    // Instantiate Matic SDK instance.
    const maticPOSClient: MaticPOSClient = await this.initMaticInstance(
      ethersSigner
    );

    // Instantiate the layer 2 wallet.
    const layer2Wallet = PolygonMaticLayer2Wallet.newInstance(
      this.network,
      ethersSigner,
      this.layer2Provider,
      maticPOSClient
    );

    return layer2Wallet;
  }

  private sameNetwork(a: string, b: string): boolean {
    const mainnets = ['mainnet', 'homestead'];
    if (mainnets.includes(a) && mainnets.includes(b)) {
      return true;
    }
    return a === b;
  }

  private async initMaticInstance(
    ethersSigner: ethers.Signer
  ): Promise<MaticPOSClient> {
    // Map ETH mainnet to Matic mainnet and ETH goerli to Matic testnet.
    // Use 'mumbai' for Matic testnet and 'v1' for Matic mainnet.
    let network: 'mainnet' | 'testnet';
    let version: 'v1' | 'mumbai';
    let rpcHostSuffix: 'mainnet' | 'mumbai';

    switch (this.network) {
      case 'goerli':
        network = 'testnet';
        version = 'mumbai';
        rpcHostSuffix = 'mumbai';
        break;
      case 'mainnet':
      case 'homestead':
        network = 'mainnet';
        version = 'v1';
        rpcHostSuffix = 'mainnet';
        break;
      default:
        throw new Error(`Network ${this.network} not supported`);
    }

    // Use a regular EIP-1193 provider (i.e. web3) to ethers lib bridge since
    // the Matic SDK uses a web3-like provider.
    const parentProvider = new Eip1193BridgeHelper(
      ethersSigner,
      ethersSigner.provider
    );

    // TODO: Add option to provide dedicated keys to invoke RPC.
    // Use Matic JSON-RPC endpoint according to the corresponding network.
    const maticProvider = `https://rpc-${rpcHostSuffix}.maticvigil.com`;

    // Instantiate Matic POS client.
    const maticPOSClient = new MaticPOSClient({
      network,
      version,
      parentProvider,
      maticProvider,
    });

    return maticPOSClient;
  }
}
