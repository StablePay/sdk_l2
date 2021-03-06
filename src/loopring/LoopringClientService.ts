import axios, { AxiosRequestConfig } from 'axios';
import { ethers } from 'ethers';
import assert from 'assert';

import { UrlEddsaSignHelper } from './EddsaSignHelper';
import { EdDSA } from './sign/eddsa';
import { KeyPair } from './sign/types';
import {
  TypedDataDomain,
  UpdateAccountMessageRequest,
  WeiFeeInfo,
} from './types';
import { EIP712Helper } from './EIP712Helper';

export class LoopringClientService {
  private urlEddsaSignHelper: UrlEddsaSignHelper | undefined;
  private eip712Helper: EIP712Helper;

  constructor(
    private signer: ethers.Wallet,
    private host: string,
    private domainData: TypedDataDomain
  ) {
    this.eip712Helper = new EIP712Helper(this.domainData);
  }

  public initUrlSignHelper(privateKey: string) {
    // Note that the EddsaSignHelper(s) are not eagerly instantiated because
    // a wallet signature is needed. Such signature may involve user interaction
    // at inappropriate times.
    this.urlEddsaSignHelper = new UrlEddsaSignHelper(privateKey, this.host);
  }

  public async isL2Activated() {
    try {
      const userInfo = await this.getUserInfo();
      if (!userInfo.publicKey.x || !userInfo.publicKey.y) {
        // Public key has not been registered.
        return false;
      }

      return true;
    } catch {
      // TODO: consider timeout/disconnection. Should rethrow in those cases.
      return false;
    }
  }

  public async getAccountKeyPair(
    contractAddress: string,
    nonce: number
  ): Promise<KeyPair> {
    // Source:
    // https://medium.com/loopring-protocol/looprings-new-approach-to-generating-layer-2-account-keys-4a16cc334906
    const M = this.generateM(contractAddress, nonce);
    const S = await this.signer.signMessage(M);

    const eddsa_seed = ethers.utils.sha256(S);

    const keyPair = EdDSA.generateKeyPair(eddsa_seed, 16);
    keyPair.publicKeyX = `0x${keyPair.publicKeyX}`;
    keyPair.publicKeyY = `0x${keyPair.publicKeyY}`;
    keyPair.secretKey = `0x${keyPair.secretKey}`;

    return keyPair;
  }

  /***
   * Response example:
   *
   * {
   *   "accountId" : 10,
   *   "owner" : "0xABCD",
   *   "frozen" : false,
   *   "publicKey" : {
   *     "x" : "0x241707bcc6d7a4ccf10304be248d343a527e85f61b45d721544d027cc1f2fb5f",
   *     "y" : "0x302f3a521dbdd1d0eb1944c8323d4ac3b3e9c9201f4aa43a2565054886369d9c"
   *   },
   *   "tags" : "vip_1",
   *   "nonce" : 0
   * }
   */
  public async getUserInfo() {
    const address = await this.signer.getAddress();

    const request: AxiosRequestConfig = {
      method: 'GET',
      baseURL: this.host,
      url: '/api/v3/account',
      params: {
        owner: address,
      },
    };

    let userInfo;
    try {
      userInfo = await this.restInvoke(request);
    } catch (err) {
      console.log(err.response.data.resultInfo);
      throw err;
    }
    return userInfo;
  }

  public async getUserOffchainApiKey(accountId: number): Promise<string> {
    assert(!!this.urlEddsaSignHelper);

    const request: AxiosRequestConfig = {
      method: 'GET',
      baseURL: this.host,
      url: '/api/v3/apiKey',
      params: {
        accountId,
      },
    };

    // Sign API request.
    const xApiSig = this.urlEddsaSignHelper.sign(request);
    // Add the signature to the request headers.
    request.headers = {
      'X-API-SIG': xApiSig,
      ...request.headers,
    };

    let requestKey: string;
    try {
      const response = await this.restInvoke(request);
      requestKey = response.apiKey as string;
    } catch (err) {
      console.log(err.response.data.resultInfo.message);
      throw err;
    }
    return requestKey;
  }

  public async updateAccountEcDSA(
    keyPair: KeyPair,
    accountId: number,
    nonce: number,
    maxFee: WeiFeeInfo
  ) {
    assert(!!this.domainData.verifyingContract);

    const exchangeContract: string = this.domainData.verifyingContract;
    const owner = await this.signer.getAddress();

    const updateAccountRequest: UpdateAccountMessageRequest = {
      exchange: exchangeContract,
      owner,
      accountId,
      publicKey: {
        x: this.xpad64(keyPair.publicKeyX),
        y: this.xpad64(keyPair.publicKeyY),
      },
      maxFee,
      validUntil: 1922227200, // Date and time (GMT): Saturday, November 30, 2030 12:00:00 AM
      nonce,
    };

    const typedData = this.eip712Helper.createUpdateAccountTypedData(
      updateAccountRequest
    );
    const xApiSig: string = await this.eip712Helper.signTypedData(
      typedData,
      this.signer
    );

    const request: AxiosRequestConfig = {
      method: 'POST',
      headers: {
        'X-API-SIG': xApiSig,
      },
      baseURL: this.host,
      url: '/api/v3/account',
      data: {
        ...updateAccountRequest,
        'X-API-SIG': xApiSig,
        ecdsaSignature: xApiSig,
      },
    };

    try {
      const responseData = await this.restInvoke(request);
    } catch (err) {
      console.log(err.response.data.resultInfo);
      throw err;
    }
  }

  public async restInvoke(request: AxiosRequestConfig) {
    request.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...request.headers,
    };

    const response = await axios(request);

    return response.data;
  }

  public edDsaSign(key: string, msg: string): KeyPair {
    const signature = EdDSA.sign(key, msg);
    const keyPair: KeyPair = {
      publicKeyX: ethers.BigNumber.from(signature.Rx).toHexString(),
      publicKeyY: ethers.BigNumber.from(signature.Ry).toHexString(),
      secretKey: ethers.BigNumber.from(signature.s).toHexString(),
    };

    return keyPair;
  }

  public keyPairConcat(keyPair: KeyPair): string {
    const x = this.pad64(keyPair.publicKeyX.substring(2));
    const y = this.pad64(keyPair.publicKeyY.substring(2));
    const s = this.pad64(keyPair.secretKey.substring(2));

    const ret = `0x${x}${y}${s}`;
    return ret;
  }

  public sha256(text: string): string {
    return ethers.utils.sha256(text);
  }

  private generateM(contractAddress: string, nonce: number): string {
    // Source:
    // https://medium.com/loopring-protocol/looprings-new-approach-to-generating-layer-2-account-keys-4a16cc334906
    const m = `Sign this message to access Loopring Exchange: ${contractAddress} with key nonce: ${nonce}`;
    return m;
  }

  private pad64(s: string): string {
    const width = 64;
    if (s.length >= width) {
      return s;
    }

    const ret = new Array(width - s.length + 1).join('0') + s;

    return ret;
  }

  private xpad64(hex: string): string {
    if (hex.startsWith('0x')) {
      return `0x${this.pad64(hex.substring(2))}`;
    }
    return this.pad64(hex);
  }
}
