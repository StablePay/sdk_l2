import { StablePayLayer2Provider } from "StablePayLayer2Provider";
import * as zksync from "zksync";
import ethers from "ethers";
import { Wallet } from "Wallet";
import { AccountStream } from "AccountStream";
import { ZkSyncDepositResult } from "./ZkSyncResult";
import { 
  Layer2Type, 
  Receipt, 
  DepositResult, 
  TransferResult, 
  WithdrawalResult,
  Network
} from "../types";
import { Deposit, Transfer, Withdrawal } from "../Operation";


export async function getZkSyncProvider(
  network: Network
): Promise<StablePayLayer2Provider> {
  return ZkSyncStablePayLayer2Provider.newInstance(network);
}

class ZkSyncStablePayLayer2Provider implements StablePayLayer2Provider {
  private constructor(
    private network: Network,
    private syncProvider: any,
    private syncWallet: any
  ) {}

  public static async newInstance(
    network: Network
  ): Promise<StablePayLayer2Provider> {
    return new Promise((resolve, reject) => {
      zksync
        .getDefaultProvider(network)
        .then((syncProvider: any) => {
          const ethersProvider = ethers.getDefaultProvider(network);

          // TODO: Obtain master key from other methods rather than the
          // mnemonics
          const ethWallet = ethers.Wallet.fromMnemonic("MNEMONIC").connect(
            ethersProvider
          );

          zksync.Wallet.fromEthSigner(ethWallet, syncProvider)
            .then((syncWallet: any) => {
              resolve(
                new ZkSyncStablePayLayer2Provider(
                  network,
                  syncProvider,
                  syncWallet
                )
              );
            })
            .catch((err: any) => {
              reject(err);
            });
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  getName(): string {
    return ZkSyncStablePayLayer2Provider.name;
  }
  getDescription(): string {
    return "Layer 2 provider for zkSynz by StablePay";
  }

  getWallet(): Wallet {
    throw new Error("Method not implemented.");
  }

  getSupportedLayer2Type(): Layer2Type {
    return Layer2Type.ZK_SYNC;
  }
  getSupportedTokens(): Set<string> {
    throw new Error("Method not implemented.");
  }
  getTokenBalances(): Promise<[[string, string]]> {
    throw new Error("Method not implemented.");
  }
  getTokenBalance(tokenSymbol: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getTokenBalanceVerified(tokenSymbol: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getWithdrawalFee(toAddress: string, tokenSymbol: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getTransferFee(toAddress: string, tokenSymbol: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getReceipt(txHash: string): Promise<Receipt> {
    throw new Error("Method not implemented.");
  }
  getAccountHistory(address: string): Promise<Receipt> {
    throw new Error("Method not implemented.");
  }
  async deposit(deposit: Deposit): Promise<DepositResult> {
    // The result of depositToSyncFromEthereum is of a class "ETHOperation".
    // Such class is not exported. Need to use 'any' here.
    const zkSyncDeposit = await this.syncWallet.depositToSyncFromEthereum({
      depositTo: this.syncWallet.address(),
      token: deposit.tokenSymbol,
      amount: ethers.utils.parseEther(deposit.amount),
    });
    return new ZkSyncDepositResult(zkSyncDeposit, deposit);
  }
  transfer(transfer: Transfer): Promise<TransferResult> {
    throw new Error("Method not implemented.");
  }
  withdraw(withdrawal: Withdrawal): Promise<WithdrawalResult> {
    throw new Error("Method not implemented.");
  }
  getAccountStream(): AccountStream {
    throw new Error("Method not implemented.");
  }
}
