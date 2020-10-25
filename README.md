# StablePay SDK for Layer 2 Solutions

[StablePay](https://www.stablepay.io/) is a decentralized cryptocurrency payment platform powered by smart-contracts in the ethereum network that allows anyone to receive easily and securely an asset-backed stablecoin through their site, mitigating the risk of high volatility in the cryptocurrency market.

**This library and its docs are still in development.**

## Installing

Using npm:

```sh
npm install @stablepay/sdk_l2
```

Using yarn:

```sh
yarn add @stablepay/sdk_l2
```

## Usage

```js
import { Layer2Manager, Layer2Type } from '@stablepay/sdk_l2'

// Obtain ZkSync Layer 2 Provider instance bound to 'ropsten' network.
const l2Provider = await Layer2Manager.getProviderByLayer2Type(
  Layer2Type.ZK_SYNC, 'ropsten');

// Obtain the Layer 2 wallet from the provider.
// First, obtain an L2 wallet builder.
const l2WalletBuilder = l2Provider.getLayer2WalletBuilder();

// Then, instantiate the wallet with the builder.
// You may instantiate the wallet either from mnemonics or by
// provider-specific options object. For ZkSync provider, "ethersSigner"
// options is valid (signer from ethers.js signer object). Consult each
// provider's specific options.
const l2Wallet = await l2WalletBuilder.fromOptions({
  ethersSigner: myInstantiatedEthersSignerJSObject
});


async printMyTokenBalance(tokenSymbol: string) {
  // For Ethereum, use 'ETH' as token symbol. Or, invoke getBalance() instead
  // of getTokenBalance() function.
  const myBalance = await l2Wallet.getTokenBalance(tokenSymbol);

  // Print to console.
  console.log(`My ${tokenSymbol} balance is ${myBalance}`);
}
```

## Running unit tests

To run unit tests, within the project's root directory, just run

```bash
$ yarn test
```

## Acknowledgments

**Grant(s) by**:
- [Ethereum Foundation](https://ethereum.foundation/)
- [MakerDao](https://makerdao.com/en/)
