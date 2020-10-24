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

...
...
...

export class SampleClass {
  public async myFunction(): Promise<any> {
    const layer2Instance = Layer2Manager.Instance;
    const provider = await layer2Instance.getProviderByLayer2Type(Layer2Type.ZK_SYNC, 'ropsten');
    return Promise.resolve(provider)
  }
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
