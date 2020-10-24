import { AccountStream } from 'AccountStream';
import { AccountBalanceState, Result, AccountBalances, Network } from './types';
import { Deposit, Transfer, Withdrawal } from 'Operation';

export interface Layer2Wallet {
  /**
   * Get the network this L2 wallet is bound to (mainnet, ropsten,
   * rinkeby, etc)
   *
   * @returns The network this L2 wallet instance is connected to.
   */
  getNetwork(): Network;

  /**
   * Get the address associated with this Layer 2 Wallet.
   *
   * @returns The address bound to this layer 2 wallet.
   */
  getAddress(): string;

  /**
   * Get the ETH balance in the layer-2 network.
   *
   * @returns Promise of the desired token's balance.
   *
   * @beta
   */
  getBalance(): Promise<string>;

  /**
   * Get the **verified** ETH balance in the layer-2 network.
   *
   * @returns Promise of the desired token's balance.
   *
   * @beta
   */
  getBalanceVerified(): Promise<string>;

  /**
   * Get the balance of the specified token in the layer-2 network. Use 'ETH'
   * for Ethereum.
   *
   * @param tokenSymbol Token symbol whose balance wants to be known.
   * @returns Promise of the desired token's balance.
   *
   * @beta
   */
  getTokenBalance(tokenSymbol: string): Promise<string>;

  /**
   * Get the **verified** balance of the specified token in the layer-2
   * network. Use 'ETH' for Ethereum.
   *
   * @param tokenSymbol Token symbol whose balance wants to be known.
   * @returns Promise of the desired token's verified balance.
   *
   * @beta
   */
  getTokenBalanceVerified(tokenSymbol: string): Promise<string>;

  /**
   * Get a collection of a triples consisting of the token symbol, available
   * balance and the balance's state (pending, commited, verified).
   *
   * @returns Promise of a collection of triples described previously.
   */
  getAccountBalances(): Promise<[string, string, AccountBalanceState][]>;

  /**
   * Gets a of type AccountBalances consisting of the token symbol, available
   * balance and the balance's state (pending, commited, verified) keyed by Symbol.
   *
   * @returns Promise of an object with all wallet account balances keyed by Symbol.
   */
  getAccountTokenBalances(): Promise<AccountBalances>;

  /**
   * Make a deposit from layer 1 to layer 2 of the specified token in the
   * deposit data.
   *
   * @remarks
   * This method requires a flag to indicate if an approval of the allowance
   * is necessary to deposit ERC20 tokens. Such a flag is specified in the
   * _deposit_ parameter.
   *
   * @param deposit - Deposit operation data including target address,
   * balances, amount, token and fees.
   * @returns Promise with the results of the deposit operation including
   * block information and commit/verification status.
   *
   * @beta
   */
  deposit(deposit: Deposit): Promise<Result>;

  /**
   * Make a transfer within layer 2 of the specified token in the transfer
   * data.
   *
   * @param transfer - Deposit operation data including target address,
   * balances, amount, token and fees.
   * @returns Promise with the results of the transfer operation including
   * block information and commit/verification status.
   *
   * @beta
   */
  transfer(transfer: Transfer): Promise<Result>;

  /**
   * Make a withdrawal from layer 2 to layer 1 of the specified token in the
   * withdrawal data.
   *
   * @param withdrawal - Withdrawal operation data including including target
   * address, amount, token and fees.
   *
   * @beta
   */
  withdraw(withdrawal: Withdrawal): Promise<Result>;

  getAccountStream(): AccountStream;
}
