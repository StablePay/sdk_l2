import * as zksync from 'zksync';
import { ZkSyncResult } from '../src/zksync/ZkSyncResult';
import { Network, OperationType, Layer2Type } from '../src/types';
import { Deposit, Withdrawal, Transfer } from '../src/Operation';
import { StablePayLayer2Manager } from '../src/StablePayLayer2Manager';
import { StablePayLayer2Provider } from '../src/StablePayLayer2Provider';
import { ethers } from 'ethers';
import { Layer2WalletBuilder } from '../src/Layer2WalletBuilder';
import { Layer2Wallet } from '../src/Layer2Wallet';

require('dotenv').config();

// Define 2-minute timeout.
jest.setTimeout(120_000);

// Global variables to all tests.
let layer2ProviderManager: StablePayLayer2Manager;
let provider: StablePayLayer2Provider;
let layer2WalletBuilder: Layer2WalletBuilder;
let ethersSigner: ethers.Signer;
let layer2Wallet: Layer2Wallet;

describe('Operation-related tests', () => {
  test('depositResult', async () => {
    const fakeDepositResultHolder: any = {
      awaitReceiptVerify: () => {
        return new Promise<zksync.types.PriorityOperationReceipt>((resolve) => {
          resolve({
            executed: true,
            block: {
              blockNumber: 666,
              committed: true,
              verified: true,
            },
          });
        });
      },
    };
    const fakeDeposit = Deposit.createDeposit({
      toAddress: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
      amount: '666.777',
      fee: '0.01',
    });
    const fakeDepositResult = new ZkSyncResult(
      fakeDepositResultHolder,
      fakeDeposit
    );

    // Method under test.
    const receipt = await fakeDepositResult.getReceiptVerify();

    // Expectations.
    expect(receipt.operationType).toBe(OperationType.Deposit);
    expect(receipt.blockNumber).toBe(666);
    expect(receipt.tokenSymbol).toBe('ETH');
    expect(receipt.committed).toBeTruthy();
    expect(receipt.verified).toBeTruthy();
  });
});

describe('Wallet-related functionality testing', () => {
  const network: Network = 'rinkeby';

  // Common setup.
  beforeAll(async () => {
    layer2ProviderManager = StablePayLayer2Manager.Instance;

    // Obtain reference to the L2 provider.
    provider = await layer2ProviderManager.getProviderByLayer2Type(
      Layer2Type.ZK_SYNC,
      network
    );

    // Obtain layer-2 wallet builder.
    layer2WalletBuilder = provider.getLayer2WalletBuilder();

    // Show how to obtain the ethers Signer.
    ethersSigner = getMockedSigner(network);

    // Obtain the layer-2 wallet from provider-specific options.
    layer2Wallet = await layer2WalletBuilder.fromOptions({ ethersSigner });

    // Required expectations.
    expect(provider.getSupportedLayer2Type()).toBe(Layer2Type.ZK_SYNC);
    expect(provider.getName().length).toBeGreaterThan(0);
  });

  // TODO: enable when mocked providers injected to manager.
  xtest('get balance', async () => {
    const address = await layer2Wallet.getAddress();
    expect(address).toBeTruthy();

    // Method under test.
    const walletBalance = await layer2Wallet.getBalance();
    expect(walletBalance).toBeTruthy();

    const walletBalances = await layer2Wallet.getAccountBalances();
    expect(walletBalances.length).toBeGreaterThan(0);
    for (const balance of walletBalances) {
      expect(balance).toBeTruthy();
    }
  });

  // TODO: Enable when signer can be mocked simulating blocknative
  xtest('layer-2 wallet from custom signer', async () => {
    // TODO: complete
  });

  xtest('layer-2 deposit from layer-1', async () => {
    // I am going to deposit to my own address in L2.
    const myAddress = layer2Wallet.getAddress();

    // Create Deposit data.
    const deposit = Deposit.createDeposit({
      toAddress: myAddress,
      amount: '0.1', // Desired amount
      fee: '0.01', // Desired fee. This is a LAYER ONE regular fee.
    });

    // Method under test. Perform DEPOSIT operation.
    const result = await layer2Wallet.deposit(deposit);

    // The result object contains the necessary methods to obtain a receipt
    // either Verified or non-verified. Verified takes long.
    const receipt = await result.getReceipt();

    // Expectations.
    expect(receipt.operationType).toBe(OperationType.Deposit);
    expect(receipt.to).toBe(myAddress);
    expect(receipt.committed).toBeTruthy();
  });

  xtest('layer-2 withdraw back to address in layer-1', async () => {
    // I am going to withdraw back to my own address in layer one.
    const myAddress = layer2Wallet.getAddress();

    // A withdrawal fee can be obtained from LAYER TWO.
    // TODO zksync failing.
    const withdrawalFee = await provider.getWithdrawalFee('ETH', myAddress);

    const withdrawal = new Withdrawal({
      toAddress: myAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: withdrawalFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Method under test. Perform WITHDRAW operation.
    const result = await layer2Wallet.withdraw(withdrawal);

    // The result object contains the necessary methods to obtain a receipt
    // either Verified or non-verified. Verified takes long.
    const receipt = await result.getReceipt();

    // Expectations.
    expect(receipt.operationType).toBe(OperationType.Withdrawal);
    expect(receipt.to).toBe(myAddress);
    expect(receipt.committed).toBeTruthy();
  });

  xtest('layer-2 to layer-2 TRANSFER', async () => {
    // Sample destination address
    const toAddress = '0x830baf0080766a88ff70f124f5016efd4af9c025';

    // A transfer fee can be obtained from LAYER TWO. Use the destination
    // address for the calculation.
    // TODO zksync failing here.
    const transferFee = await provider.getTransferFee('ETH', toAddress);

    const transfer = new Transfer({
      toAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: transferFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Method under test. Perform WITHDRAW operation.
    const result = await layer2Wallet.transfer(transfer);

    // The result object contains the necessary methods to obtain a receipt
    // either Verified or non-verified. Verified takes long.
    const receipt = await result.getReceipt();

    // Expectations.
    expect(receipt.operationType).toBe(OperationType.Transfer);
    expect(receipt.to).toBe(toAddress);
    expect(receipt.committed).toBeTruthy();
  });
});

// Utility functions

function getMockedSigner(network: Network): ethers.Signer {
  // TODO: See what's going on here.
  const ethers = require('ethers');

  const ethersProvider = new ethers.getDefaultProvider(network);

  const DO_NOT_REVEAL_THESE_MNEMONICS = process.env.TEST_MNEMONICS;
  expect(DO_NOT_REVEAL_THESE_MNEMONICS).toBeTruthy();

  // Create ethereum wallet using ethers.js

  // TODO: Obtain signer from mocked blocknative and provider.
  const ethersWallet = ethers.Wallet.fromMnemonic(
    DO_NOT_REVEAL_THESE_MNEMONICS
  ).connect(ethersProvider);

  return ethersWallet;
}
