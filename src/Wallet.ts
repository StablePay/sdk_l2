import { AccountStream } from 'AccountStream';
import { Result } from 'types';
import { Deposit, Transfer, Withdrawal } from 'Operation';

export interface Wallet {
  /**
   * Get a collection of a triples consisting of the token symbol, available
   * balance and a flag if such a balance is verified or not.
   *
   * @returns Promise of a collection of triples described previously.
   */
  getTokenBalances(): Promise<[[string, string, boolean]]>;

  /**
   * Get the balance of the specified token in the layer-2 network. Use 'ETH'
   * for Ethereum.
   *
   * @param tokenSymbol Token symbol whose balance wants to be known.
   * @returns Promise of the desired token's balance.
   */
  getTokenBalance(tokenSymbol: string): Promise<string>;

  /**
   * Get the **verified** balance of the specified token in the layer-2
   * network. Use 'ETH' for Ethereum.
   *
   * @param tokenSymbol Token symbol whose balance wants to be known.
   * @returns Promise of the desired token's verified balance.
   */
  getTokenBalanceVerified(tokenSymbol: string): Promise<string>;

  /**
   * Make a deposit from layer 1 to layer 2 of the specified token in the
   * deposit data.
   *
   * @remarks
   * This method requires a flag to indicate if an approval of the allowance
   * is necessary todeposit ERC20 tokens. Such a flag is specified in the
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
   * Make a trasnfer within layer 2 of the specified token in the transfer
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
