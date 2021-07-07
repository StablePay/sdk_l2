import { Decimal } from 'decimal.js';
import { Network } from 'types';
import { AbiItem } from 'web3-utils';
import { TokenInfoMetadata } from './types';

export const TenAsDecimal = new Decimal(10);

export const RequestBatchSize = 32;

export const erc20BalanceOfAbi: AbiItem[] = [
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

export const MATIC_TOKEN_INFO_BY_NETWORK: Record<
  Network,
  TokenInfoMetadata | undefined
> = {
  localhost: undefined,
  rinkeby: undefined,
  ropsten: undefined,
  mainnet: {
    baseURL: 'https://tokenmapper.api.matic.today',
    url: '/api/v1/mapping',
    chainId: 137,
    mapType: '["POS"]',
    tokenType: 'ERC20',
    rootChainAddress: '0x86E4Dc95c7FBdBf52e33D563BbDB00823894C287',
  },
  goerli: {
    baseURL: 'https://tokenmapper.api.matic.today',
    url: '/api/v1/mapping',
    chainId: 80001,
    mapType: '["POS"]',
    tokenType: 'ERC20',
    rootChainAddress: '0x2890bA17EfE978480615e330ecB65333b880928e',
  },
  // 'homestead' is being as synonym for 'mainnet'.
  homestead: {
    baseURL: 'https://tokenmapper.api.matic.today',
    url: '/api/v1/mapping',
    chainId: 137,
    mapType: '["POS"]',
    tokenType: 'ERC20',
    rootChainAddress: '0x86E4Dc95c7FBdBf52e33D563BbDB00823894C287',
  },
};

export const MATIC_ETH_TOKEN_ADDRESS_BY_NETWORK: Record<
  Network,
  string | undefined
> = {
  localhost: undefined,
  rinkeby: undefined,
  ropsten: undefined,
  mainnet: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  goerli: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
  // 'homestead' is being as synonym for 'mainnet'.
  homestead: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
};

export const uniswapTokenList = [
  'USDT',
  'YFI',
  'KNC',
  'ANT',
  'GNO',
  'LOOM',
  'MANA',
  'CRV',
  'TBTC',
  'BAL',
  'STORJ',
  'UMA',
  'UNI',
  'WETH',
  'CVC',
  'REP',
  'DNT',
  'GRT',
  'USDC',
  'KEEP',
  'WBTC',
  'REPv2',
  'AMP',
  'LINK',
  'MKR',
  'SNX',
  'OXT',
  'DAI',
  'REN',
  'NMR',
  'ZRX',
  'MLN',
  'NU',
  'BNT',
  'COMP',
  'AAVE',
  'LRC',
  'BAND',
];
