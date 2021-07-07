import ethers from 'ethers';

export interface PolygonMaticWalletOptions {
  ethersSigner: ethers.Signer;
}

export type TokenInfoMetadata = {
  baseURL: string;
  url: string;
  chainId: number;
  mapType: string;
  tokenType: 'ERC20'; // Only Matic ERC20 token type is supported in this library.
  rootChainAddress: string;
};

export class TokenData {
  constructor(
    private _tokenId: number,
    private _symbol: string,
    private _name: string,
    private _rootAddress: string,
    private _childAddress: string,
    private _decimals: number
  ) {
    // Do nothing.
  }

  get tokenId() {
    return this._tokenId;
  }
  get symbol() {
    return this._symbol;
  }
  get name() {
    return this._name;
  }
  get rootAddress() {
    return this._rootAddress;
  }
  get childAddress() {
    return this._childAddress;
  }
  get decimals() {
    return this._decimals;
  }
}

export type TokenDataDict = { [symbol: string]: TokenData };

export type CanonicalEthTransaction = {
  from: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  chainId: number;
  value: string;
  to: string;
  data: string;
};
