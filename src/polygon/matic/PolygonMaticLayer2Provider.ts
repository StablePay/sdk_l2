import { Layer2Provider } from 'Layer2Provider';
import { Layer2Type, Receipt, Network } from '../../types';
import { PolygonMaticLayer2WalletBuilder } from './PolygonMaticLayer2WalletBuilder';
import { Layer2WalletBuilder } from 'Layer2WalletBuilder';
import { TokenInfoMetadata, TokenData, TokenDataDict } from './types';

import axios, { AxiosRequestConfig } from 'axios';
import {
  MATIC_ETH_TOKEN_ADDRESS_BY_NETWORK,
  MATIC_TOKEN_INFO_BY_NETWORK,
} from './constants';

export async function getPolygonMaticProvider(
  network: Network
): Promise<Layer2Provider> {
  return PolygonMaticLayer2Provider.newInstance(network);
}

export class PolygonMaticLayer2Provider implements Layer2Provider {
  private readonly walletBuilder: Layer2WalletBuilder;

  // Lazy load this member, so initialize to null.
  private _tokenDataBySymbol: TokenDataDict | null = null;

  private constructor(private readonly network: Network) {
    this.walletBuilder = new PolygonMaticLayer2WalletBuilder(
      this.network,
      this
    );
  }

  public static async newInstance(network: Network): Promise<Layer2Provider> {
    return new PolygonMaticLayer2Provider(network);
  }

  getName(): string {
    return PolygonMaticLayer2Provider.name;
  }

  getDescription(): string {
    return 'Layer 2 provider for Matic (Polygon) by StablePay';
  }

  getNetwork(): Network {
    return this.network;
  }

  getSupportedLayer2Type(): Layer2Type {
    return Layer2Type.POLYGON_MATIC;
  }

  async getSupportedTokens(): Promise<Set<string>> {
    const tokenDataBySymbol = (await this.getTokenDataBySymbol()) as object;
    const ret = new Set<string>();

    for (const symbol of Object.keys(tokenDataBySymbol)) {
      ret.add(symbol);
    }

    return ret;
  }

  getLayer2WalletBuilder(): Layer2WalletBuilder {
    return this.walletBuilder;
  }

  async getWithdrawalFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async getTransferFee(
    toAddress: string,
    tokenSymbol: string
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error('Method not implemented.');
  }

  async disconnect() {
    // nothing to do.
  }

  async getTokenDataBySymbol(): Promise<TokenDataDict> {
    if (!this._tokenDataBySymbol) {
      const tokenDataBySymbol: TokenDataDict = {};
      const tokenInfo = this.getTokenInfoByNetwork();

      // Add token information for ETH. This is because ETH is represented as
      // an ERC-20 token within Polygon/Matic (POS)
      tokenDataBySymbol['ETH'] = new TokenData(
        -1, // id,
        'ETH', // symbol
        'Ethereum', // name
        '0x0000000000000000000000000000000000000000', // root_token
        this.getEthTokenAddressByNetwork(), // child_token
        18 // decimals
      );

      // Create paged request to bring token mapping information from the Matic
      // network.
      const request: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        method: 'GET',
        baseURL: tokenInfo.baseURL,
        url: tokenInfo.url,
        params: {
          map_type: tokenInfo.mapType, //'["POS"]',//
          chain_id: tokenInfo.chainId,
          token_type: tokenInfo.tokenType,
          limit: 200, // Response page limit.
          offset: 0, // Start from the very first record.
        },
      };

      try {
        let hasNextPage = false;
        do {
          // Make actual request.
          const response = await axios(request);

          // Get response body and check for success.
          const body = response.data;
          if (body.message !== 'success') {
            throw new Error(
              `Could not retrieve supported tokens: ${body.message}`
            );
          }

          // Obtain the token mappings and extract id, symbol, name and address
          // within the Matic network.
          const tokenMappings = body.data.mapping;
          for (const mapping of tokenMappings) {
            if (!mapping.symbol) {
              // Skip any entry with no symbol.
              continue;
            }
            // Add token data.
            tokenDataBySymbol[mapping.symbol] = new TokenData(
              mapping.id,
              mapping.symbol,
              mapping.name,
              mapping.root_token.substring(0, 42),
              mapping.child_token.substring(0, 42),
              mapping.decimals
            );
          }

          // See if there is a next page to continue sending REST requests for
          // more tokens.
          hasNextPage = body.data.has_next_page;
          if (hasNextPage) {
            // Get offset for new page.
            request.params.offset += tokenMappings.length;
          }
        } while (hasNextPage);

        // Set tokenDataBySymbol field.
        this._tokenDataBySymbol = tokenDataBySymbol;
      } catch (err) {
        throw new Error(
          `Could not retrieve supported tokens: ${err.response.status} - ${err.response.statusText}`
        );
      }
    }

    return this._tokenDataBySymbol;
  }

  getTokenInfoByNetwork(): TokenInfoMetadata {
    const tokenInfo: TokenInfoMetadata | undefined =
      MATIC_TOKEN_INFO_BY_NETWORK[this.network];
    if (!tokenInfo) {
      throw new Error(`Network ${this.network} not supported`);
    }
    return tokenInfo;
  }

  getEthTokenAddressByNetwork(): string {
    const ethAddress = MATIC_ETH_TOKEN_ADDRESS_BY_NETWORK[this.network];
    if (!ethAddress) {
      throw new Error(`No ETH token address for network ${this.network}`);
    }

    return ethAddress;
  }

  getChildChainIdByNetwork(): number {
    const tokenInfo = MATIC_TOKEN_INFO_BY_NETWORK[this.network];
    if (!tokenInfo) {
      throw new Error(`Network ${this.network} not supported`);
    }
    return tokenInfo.chainId;
  }
}
