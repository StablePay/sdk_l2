import { MaticPOSClient } from '@maticnetwork/maticjs';
import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';

import { PolygonMaticLayer2Provider } from './PolygonMaticLayer2Provider';
import { Deposit, Transfer, Withdrawal, Operation } from '../../Operation';
import { Layer2Wallet } from '../../Layer2Wallet';
import AccountStream from '../../AccountStream';

// TYPES
import { TokenData, TokenDataDict } from './types';
import {
  AccountBalanceState,
  Result,
  AccountBalances,
  Network,
  BigNumberish,
} from '../../types';

// CONSTANTS
import {
  erc20BalanceOfAbi,
  RequestBatchSize,
  TenAsDecimal,
  uniswapTokenList,
} from './constants';

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { PolygonMaticResult } from './PolygonMaticResult';
import { SendOptions } from '@maticnetwork/maticjs/lib/types/Common';

export class PolygonMaticLayer2Wallet implements Layer2Wallet {
  private readonly accountStream: AccountStream;

  private constructor(
    private readonly network: Network,
    private readonly ethersSigner: ethers.Signer,
    private readonly address: string,
    private readonly polygonMaticProvider: PolygonMaticLayer2Provider,
    private readonly tokenDataBySymbol: TokenDataDict,
    private readonly maticPOSClient: MaticPOSClient
  ) {
    this.accountStream = new AccountStream(this);
  }

  static async newInstance(
    network: Network,
    ethersSigner: ethers.Signer,
    polygonMaticProvider: PolygonMaticLayer2Provider,
    maticPOSClient: MaticPOSClient
  ): Promise<PolygonMaticLayer2Wallet> {
    // Load Loopring ExchangeV3 ABI.
    const address = await ethersSigner.getAddress();
    const tokenDataBySymbol = await polygonMaticProvider.getTokenDataBySymbol();

    // Create promise for new instance.
    const layer2Wallet = new PolygonMaticLayer2Wallet(
      network,
      ethersSigner,
      address,
      polygonMaticProvider,
      tokenDataBySymbol,
      maticPOSClient
    );

    return layer2Wallet;
  }

  getNetwork(): Network {
    return this.network;
  }

  getAddress(): string {
    return this.address;
  }

  async getBalance(): Promise<BigNumberish> {
    return this.getTokenBalance('ETH');
  }

  async getBalanceVerified(): Promise<BigNumberish> {
    return this.getBalance();
  }

  async getTokenBalance(tokenSymbol: string): Promise<BigNumberish> {
    // Get the ERC-20 token address within the Polygon network.
    const tokenAddress = this.tokenDataBySymbol[tokenSymbol].childAddress;

    // Obtain the token's balance.
    const balance: string = await this.maticPOSClient.balanceOfERC20(
      this.address,
      tokenAddress,
      { parent: false }
    );

    const balanceInUnits = this.parseAmountToUnits(balance, tokenSymbol);

    return balanceInUnits;
  }

  async getTokenBalanceVerified(tokenSymbol: string): Promise<BigNumberish> {
    return this.getTokenBalance(tokenSymbol);
  }

  // TODO: deprecate to use getAccountTokenBalances or refactor to use getAccountTokenBalances impl
  async getAccountBalances(): Promise<[string, string, AccountBalanceState][]> {
    // Return triple of [symbol, balance, state]
    const ret: [string, string, AccountBalanceState][] = [];

    const tokenBalaces: AccountBalances = await this.getAccountTokenBalances();

    for (const [symbol, tokenBalance] of Object.entries(tokenBalaces)) {
      for (const [state, balance] of Object.entries(tokenBalance)) {
        ret.push([symbol, balance.toString(), state as AccountBalanceState]);
      }
    }

    return ret;
  }

  async getAccountTokenBalances(): Promise<AccountBalances> {
    // Filter tokens of interest.
    const tokenDataList = Object.values(this.tokenDataBySymbol).filter(
      (tokenData) =>
        uniswapTokenList.includes(tokenData.symbol) ||
        tokenData.symbol === 'ETH'
    );

    const accountAllBalances: AccountBalances = {};

    // Collect token balance batches.
    let idx = 0;
    while (idx < tokenDataList.length) {
      const tokenDataSlice = tokenDataList.slice(idx, idx + RequestBatchSize);
      const accountBalances: AccountBalances = await this.getAccountTokenBalancesAux(
        tokenDataSlice
      );

      Object.assign(accountAllBalances, accountBalances);

      idx += RequestBatchSize;
    }

    return accountAllBalances;
  }

  async deposit(deposit: Deposit): Promise<Result> {
    if (deposit.tokenSymbol !== 'ETH') {
      // Check if token other than ETH is supported.
      if (!(deposit.tokenSymbol in this.tokenDataBySymbol)) {
        throw new Error(`Token ${deposit.tokenSymbol} not supported`);
      }
    }

    if (deposit.toAddress !== this.address) {
      throw new Error(
        `Making deposit to an address different from wallet's is not supported. Address: ${deposit.toAddress}`
      );
    }

    // Get the amount to deposit in Wei, BN type.
    const depositAmountWeiBN = this.parseAmountToBN(
      deposit.amount,
      deposit.tokenSymbol
    );

    // TODO: Add gas price to Deposit operation. If not defined, get the gas
    // price like here.
    const gasPrice: BigNumber = await this.ethersSigner.getGasPrice();

    const result = new Promise<Result>((resolveResult, rejectResult) => {
      // Deposit awaitable is the final transaction receipt.
      const receiptAwaitable = new Promise(async (resolveReceipt) => {
        // Set send options either for ETH or any other ERC20 token.
        const sendOptions: SendOptions = {
          from: this.address,
          gasPrice: gasPrice.toString(),
          onTransactionHash: (hash: any) => {
            // Instantiate Polygon/Matic transaction result. As soon as we get
            // a transaction hash, we can resolve result with hash and the
            // receipt awaitable.
            const polygonMaticDepositResult = new PolygonMaticResult(
              {
                hash,
                awaitable: receiptAwaitable,
              },
              deposit,
              gasPrice
            );

            // Resolve promise with result.
            resolveResult(polygonMaticDepositResult);
          },
          onReceipt: (receipt: any) => {
            // Resolve receipt promise.
            resolveReceipt(receipt);
          },
          onError: (err: any) => {
            // Reject promise in case of error.
            rejectResult(err);
          },
        };

        try {
          if (deposit.tokenSymbol === 'ETH') {
            // Send ETH.
            this.maticPOSClient.depositEtherForUser(
              this.address, // from the current user's address.
              depositAmountWeiBN,
              sendOptions
            );
          } else {
            // Obtain the address for the ERC-20 token contract.
            const tokenData = this.tokenDataBySymbol[deposit.tokenSymbol];

            if (deposit.approveForErc20) {
              // Check the current allowance first to see if we should call the
              // approve function to increase allowance.

              // Get user's address allowance.
              const allowance = await this.maticPOSClient.getERC20Allowance(
                this.address,
                tokenData.rootAddress
              );
              const allowanceBN = this.parseAmountToBN(
                allowance,
                deposit.tokenSymbol
              );

              // Invoke approve if the allowance is not enough.
              if (depositAmountWeiBN.gt(allowanceBN)) {
                await this.maticPOSClient.approveERC20ForDeposit(
                  tokenData.rootAddress,
                  depositAmountWeiBN,
                  { from: this.address }
                );
              }
            }

            // Send the specified ERC-20 token.
            this.maticPOSClient.depositERC20ForUser(
              tokenData.rootAddress,
              this.address, // from the current user's address.
              depositAmountWeiBN,
              sendOptions
            );
          }
        } catch (err) {
          // Reject transaction result if any exception thrown.
          rejectResult(err);
        }
      });
    });

    return result;
  }

  async transfer(transfer: Transfer): Promise<Result> {
    throw new Error('Not implemented');
  }

  async withdraw(withdrawal: Withdrawal): Promise<Result> {
    throw new Error('Not implemented');
  }

  async getAccountEvents(): Promise<EventEmitter> {
    throw new Error('Not implemented');
  }

  private parseAmountToBN(amount: string, symbol: string) {
    if (symbol === 'ETH') {
      const amountWei = ethers.utils.parseEther(amount);
      const amountWeiBN = new BN(amountWei.toString());

      return amountWeiBN;
    }

    // In case of ERC20 token, use the "decimals" information.
    const tokenData = this.tokenDataBySymbol[symbol];
    const amountUnits = ethers.utils.parseUnits(amount, tokenData.decimals);
    const amountUnitsBN = new BN(amountUnits.toString());

    return amountUnitsBN;
  }

  private parseAmountToUnits(weiAmount: string, symbol: string): string {
    const weiAmountDecimal = new Decimal(weiAmount);

    if (symbol === 'ETH') {
      const amountUnits = weiAmountDecimal.div(TenAsDecimal.pow(18));

      return amountUnits.toString();
    }

    // In case of ERC20 token, use the "decimals" information.
    const tokenData = this.tokenDataBySymbol[symbol];
    const amountUnits = weiAmountDecimal.div(
      TenAsDecimal.pow(tokenData.decimals)
    );
    return amountUnits.toString();
  }

  private async getAccountTokenBalancesAux(
    tokenDataSlice: TokenData[]
  ): Promise<AccountBalances> {
    const batch = new this.maticPOSClient.web3Client.web3.BatchRequest();

    const accountAllBalances: AccountBalances = {};

    // TODO: Define proper values for slicing.
    const tokenBalances = tokenDataSlice.map(
      (tokenData) =>
        new Promise((resolve) => {
          // Get checksummed address for ERC-20 contract in Polygon.
          const tokenAddress = ethers.utils.getAddress(tokenData.childAddress);

          // Set contract ABI options to consult balance
          const contract = new this.maticPOSClient.web3Client.web3.eth.Contract(
            erc20BalanceOfAbi
          );
          contract.options.address = tokenAddress;

          // Create contract balance call request at the latest block with the
          // response callback.
          const contractCallRequest = contract.methods
            .balanceOf(this.address)
            .call.request({}, 'latest');
          contractCallRequest.callback = (_: any, balanceInWei: string) => {
            if (balanceInWei) {
              // Resolve with the token's balance.
              const accBalance: AccountBalances = {
                [tokenData.symbol]: {
                  verified: this.parseAmountToUnits(
                    balanceInWei,
                    tokenData.symbol
                  ),
                },
              };
              resolve(accBalance);
            } else {
              // In case of not being able to retrieve the balance, use a
              // "failed" state with undefined balance. Very commonly, balances
              // fail to be retrieved when there have been too many requests in
              // a row.
              resolve({
                [tokenData.symbol]: {
                  failed: undefined,
                },
              });
            }
          };

          // Add balance request to the request batch.
          batch.add(contractCallRequest);
        })
    );

    batch.execute();

    const balanceList = await Promise.all(tokenBalances);
    for (const balance of balanceList) {
      Object.assign(accountAllBalances, balance);
    }

    return accountAllBalances;
  }
}
