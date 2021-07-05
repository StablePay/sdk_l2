import { MaticPOSClient } from '@maticnetwork/maticjs';
import Web3 from 'web3';
import { CanonicalEthTransaction } from './types';
import BN from 'bn.js';

export class PolygonClientHelper {
  private readonly web3: Web3;

  constructor(
    private readonly maticPOSClient: MaticPOSClient,
    private readonly chainId: number
  ) {
    this.web3 = maticPOSClient.web3Client.web3;
  }

  async getGasPrice(inHex?: boolean): Promise<string> {
    const useHex = !!inHex;
    const gasPrice = await this.web3.eth.getGasPrice();
    if (useHex) {
      const gasPriceHex = Number(gasPrice).toString(16);
      return `0x${gasPriceHex}`;
    }

    return gasPrice;
  }

  async getNonce(address: string): Promise<number> {
    return this.web3.eth.getTransactionCount(address);
  }

  async estimateGas(
    contractMethodTxObject: any,
    fromAddress: string
  ): Promise<number> {
    const gas: number = await contractMethodTxObject.estimateGas({
      from: fromAddress,
    });
    return gas;
  }

  async getGasLimit(
    contractMethodTxObject: any,
    fromAddress: string,
    multiplier: number,
    inHex?: boolean
  ): Promise<string> {
    const useHex = !!inHex;
    const estimatedTxGas: number = await this.estimateGas(
      contractMethodTxObject,
      fromAddress
    );
    const gasLimit = Math.ceil(multiplier * estimatedTxGas);

    if (useHex) {
      return `0x${gasLimit.toString(16)}`;
    }

    return gasLimit.toString(10);
  }

  sendSignedTransaction(signedRawTx: string) {
    return this.web3.eth.sendSignedTransaction(signedRawTx);
  }

  async getERC20Allowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ) {
    // Get the ERC-20 token contract for the specified token address.
    const contract = this.maticPOSClient.getERC20TokenContract(
      tokenAddress,
      false // parent: false
    );

    // Create the TX object and encode its ABI.
    const allowance = await contract.methods
      .allowance(ownerAddress, spenderAddress)
      .call();

    return allowance;
  }

  async createERC20SignedTransferTx(
    tokenAddress: string,
    fromAddress: string,
    toAddress: string,
    transferAmountWeiBN: any,
    doSignTransaction: (txObject: CanonicalEthTransaction) => Promise<string>
  ): Promise<string> {
    // Get the ERC-20 token contract for the specified token address.
    const contract = this.maticPOSClient.getERC20TokenContract(
      tokenAddress,
      false // parent: false
    );

    // Create the TX object and encode its ABI.
    const contractMethodTxObject = contract.methods.transfer(
      toAddress,
      transferAmountWeiBN
    );
    const data = contractMethodTxObject.encodeABI();

    // FIXME: Estimate gas limit using a multiplier of 2.
    const multiplier = 2;
    const gasLimitHex: string = await this.getGasLimit(
      contractMethodTxObject,
      fromAddress,
      multiplier,
      true
    );

    // Obtain the gas price from the Polygon network.
    const gasPriceHex: string = await this.getGasPrice(true);

    // Obtain sender's address nonce (transaction count).
    const nonce: number = await this.getNonce(fromAddress);

    // Create the ETH transaction to invoke the transfer operation.
    const txObject: CanonicalEthTransaction = {
      from: fromAddress,
      gasLimit: gasLimitHex,
      gasPrice: gasPriceHex,
      nonce,
      chainId: this.chainId,
      value: '0x00', // Intentionally left at zero.
      to: tokenAddress,
      data,
    };

    // Sign the transaction locally.
    const signedRawTx: string = await doSignTransaction(txObject);

    return signedRawTx;
  }

  async createPOSERC20SignedBurnTx(
    tokenAddress: string,
    userAddress: string,
    transferAmountWeiBN: any,
    doSignTransaction: (txObject: CanonicalEthTransaction) => Promise<string>
  ): Promise<string> {
    // Get the ERC-20 token contract for the specified token address.
    const contract = this.maticPOSClient.getPOSERC20TokenContract(
      tokenAddress,
      false // parent: false
    );

    // Create the TX object and encode its ABI.
    const contractMethodTxObject = contract.methods.withdraw(
      userAddress,
      this.encodeNumberToHex(transferAmountWeiBN)
    );
    const data = contractMethodTxObject.encodeABI();

    // FIXME: Estimate gas limit using a multiplier of 2.
    const multiplier = 2;
    const gasLimitHex: string = await this.getGasLimit(
      contractMethodTxObject,
      userAddress,
      multiplier,
      true
    );

    // Obtain the gas price from the Polygon network.
    const gasPriceHex: string = await this.getGasPrice(true);

    // Obtain sender's address nonce (transaction count).
    const nonce: number = await this.getNonce(userAddress);

    // Create the ETH transaction to invoke the withdrawal (burn) operation.
    const txObject: CanonicalEthTransaction = {
      from: userAddress,
      gasLimit: gasLimitHex,
      gasPrice: gasPriceHex,
      nonce,
      chainId: this.chainId,
      value: '0x00', // Intentionally left at zero.
      to: tokenAddress,
      data,
    };

    // Sign the transaction locally.
    const signedRawTx: string = await doSignTransaction(txObject);

    return signedRawTx;
  }

  public encodeNumberToHex(number: BN | string | number) {
    if (typeof number === 'number') {
      number = new BN(number);
    } else if (typeof number === 'string') {
      if (number.slice(0, 2) === '0x') return number;
      number = new BN(number);
    }
    if (BN.isBN(number)) {
      return '0x' + number.toString(16);
    }
  }
}
