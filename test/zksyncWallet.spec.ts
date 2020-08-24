import { mockDeep, MockProxy } from 'jest-mock-extended';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';
import { Network, OperationType, Layer2Type } from '../src/types';
import { Deposit, Withdrawal, Transfer, Operation } from '../src/Operation';
import { StablePayLayer2Manager } from '../src/StablePayLayer2Manager';
import { StablePayLayer2Provider } from '../src/StablePayLayer2Provider';
import { ethers, BigNumber } from 'ethers';
import { Layer2WalletBuilder } from '../src/Layer2WalletBuilder';
import { Layer2Wallet } from '../src/Layer2Wallet';
import { ZkSyncLayer2Wallet } from '../src/zksync/ZkSyncLayer2Wallet';

import { buildMockSigner, buildMockWallet, buildMockProvider } from './helpers';
import { ZkSyncResult } from '../src/zksync/ZkSyncResult';

require('dotenv').config();

// Define 2-minute timeout.
jest.setTimeout(120_000);

// Global variables to all tests.
const SAMPLE_ADDRESS = '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';
const ETH_BALANCE = BigNumber.from('100000000000000000');

let layer2ProviderManager: StablePayLayer2Manager;
let provider: StablePayLayer2Provider;
let layer2WalletBuilder: Layer2WalletBuilder;
let ethersSigner: MockProxy<ethers.Signer> & ethers.Signer;
let zkSyncWallet: MockProxy<ZkSyncWallet> & ZkSyncWallet;
let zkSyncProvider: MockProxy<ZkSyncProvider> & ZkSyncProvider;
let layer2Wallet: Layer2Wallet;

// TODO: add more unit tests
describe('zkSync Wallet-related functionality testing', () => {
  const network: Network = 'rinkeby';

  // Common setup.
  beforeEach(async () => {
    ethersSigner = buildMockSigner();
    zkSyncWallet = buildMockWallet();
    zkSyncProvider = buildMockProvider();

    // Obtain the layer-2 wallet from provider-specific options.
    layer2Wallet = new ZkSyncLayer2Wallet(
      zkSyncWallet,
      ethersSigner,
      zkSyncProvider
    );

    // mock setup
    zkSyncWallet.address.mockReturnValue(SAMPLE_ADDRESS);
    zkSyncWallet.getBalance.mockReturnValue(Promise.resolve(ETH_BALANCE));
  });

  it('should get balance info from wallet', async () => {
    // Test setup.
    const address = await layer2Wallet.getAddress();
    expect(address).toBe(SAMPLE_ADDRESS);

    // Method under test.
    const walletBalance = await layer2Wallet.getBalance();

    // Expectations.
    expect(walletBalance).toBe(ETH_BALANCE.toString());
  });

  it('should unlock account if locked on Transfer txn', async () => {
    // Test setup.
    // Start with a locked account.
    let accountLocked = true;
    // Transfer data.
    const toAddress = SAMPLE_ADDRESS;
    const transferFee = '0.01';
    const transfer = new Transfer({
      toAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: transferFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    (layer2Wallet as any).upgradeToSigningWallet = async () => {
      (layer2Wallet as any).isSigningWallet = true;
      // return new Promise((resolve) => {
      //   resolve();
      // });
      return Promise.resolve();
    };

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = () => {
      // Simulate account unlock.
      accountLocked = false;
      return new Promise((resolve) => {
        resolve();
      });
    };

    zkSyncWallet.syncTransfer.mockImplementation(async () => {
      if (accountLocked) {
        // Simulate locked account.
        throw new Error('Account is locked.');
      } else {
        // Return dummy value.
        return {} as any;
      }
    });

    // Method under test.
    await layer2Wallet.transfer(transfer);

    // Expectations.
    expect(accountLocked).toBeFalsy();
    expect(zkSyncWallet.syncTransfer).toHaveBeenCalledTimes(2);
  });

  it('should throw exception immediately on unlocked account when TRANSFER txn', async () => {
    // Test setup.
    // Start with a UNLOCKED account.
    let accountLocked = false;
    // Transfer data.
    const toAddress = SAMPLE_ADDRESS;
    const transferFee = '0.01';
    const transfer = new Transfer({
      toAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: transferFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Set as signing wallet.
    (layer2Wallet as any).isSigningWallet = true;

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = mockDeep();

    const ERROR_MSG = 'Metamask Cancel';
    zkSyncWallet.syncTransfer.mockImplementation(async () => {
      if (accountLocked) {
        // Simulate locked account.
        throw new Error('Account is locked.');
      } else {
        // Throw dummy exception.
        throw new Error(ERROR_MSG);
      }
    });

    // Method under test.
    const transferFn = async () => await layer2Wallet.transfer(transfer);

    // Expectations.
    await expect(transferFn).rejects.toThrow(ERROR_MSG);
    expect(zkSyncWallet.syncTransfer).toHaveBeenCalledTimes(1);
  });

  it('should unlock account if locked on WITHDRAW txn', async () => {
    // Test setup.
    // Start with a locked account.
    let accountLocked = true;
    // Transfer data.

    // Withdraw back to the LAYER 1 wallet's address.
    const myAddress = layer2Wallet.getAddress();

    // A withdrawal fee from LAYER TWO.
    const withdrawalFee = '0.01';

    const withdrawal = new Withdrawal({
      toAddress: myAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: withdrawalFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    (layer2Wallet as any).upgradeToSigningWallet = async () => {
      (layer2Wallet as any).isSigningWallet = true;
      return new Promise((resolve) => {
        resolve();
      });
    };

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = () => {
      // Simulate account unlock.
      accountLocked = false;
      return new Promise((resolve) => {
        resolve();
      });
    };

    zkSyncWallet.withdrawFromSyncToEthereum.mockImplementation(async () => {
      if (accountLocked) {
        // Simulate locked account.
        throw new Error('Account is locked.');
      } else {
        // Return dummy value.
        return {} as any;
      }
    });

    // Method under test. Perform WITHDRAW operation.
    await layer2Wallet.withdraw(withdrawal);

    // Expectations.
    expect(accountLocked).toBeFalsy();
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(2);
  });

  it('should throw exception immediately on unlocked account when WITHDRAW txn', async () => {
    // Test setup.
    // Start with a UNLOCKED account.
    let accountLocked = false;

    // Withdraw back to the LAYER 1 wallet's address.
    const myAddress = layer2Wallet.getAddress();

    // A withdrawal fee from LAYER TWO.
    const withdrawalFee = '0.01';

    const withdrawal = new Withdrawal({
      toAddress: myAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: withdrawalFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Set as signing wallet.
    (layer2Wallet as any).isSigningWallet = true;

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = mockDeep();

    const ERROR_MSG = 'Metamask Cancel';
    zkSyncWallet.withdrawFromSyncToEthereum.mockImplementation(async () => {
      if (accountLocked) {
        // Simulate locked account.
        throw new Error('Account is locked.');
      } else {
        // Throw dummy exception.
        throw new Error(ERROR_MSG);
      }
    });

    // Method under test.
    const transferFn = async () => await layer2Wallet.withdraw(withdrawal);

    // Expectations.
    await expect(transferFn).rejects.toThrow(ERROR_MSG);
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(1);
  });

  it('should throw exception immediately on unlocked account when WITHDRAW txn', async () => {
    // Test setup.
    // Start with a UNLOCKED account.
    let accountLocked = false;

    // Withdraw back to the LAYER 1 wallet's address.
    const myAddress = layer2Wallet.getAddress();

    // A withdrawal fee from LAYER TWO.
    const withdrawalFee = '0.01';

    const withdrawal = new Withdrawal({
      toAddress: myAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: withdrawalFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Set as signing wallet.
    (layer2Wallet as any).isSigningWallet = true;

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = mockDeep();

    const ERROR_MSG = 'Metamask Cancel';
    zkSyncWallet.withdrawFromSyncToEthereum.mockImplementation(async () => {
      if (accountLocked) {
        // Simulate locked account.
        throw new Error('Account is locked.');
      } else {
        // Throw dummy exception.
        throw new Error(ERROR_MSG);
      }
    });

    // Method under test.
    const transferFn = async () => await layer2Wallet.withdraw(withdrawal);

    // Expectations.
    await expect(transferFn).rejects.toThrow(ERROR_MSG);
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(1);
    //expect((layer2Wallet as any).unlockAccount).not.toHaveBeenCalled();
  });

  it('WITHDRAW txn happy path', async () => {
    // Test setup.

    // Withdraw back to the LAYER 1 wallet's address.
    const myAddress = layer2Wallet.getAddress();

    // A withdrawal fee from LAYER TWO.
    const withdrawalFee = '0.01';

    const withdrawal = new Withdrawal({
      toAddress: myAddress,
      amount: '0.1', // Desired amount to withdraw.
      fee: withdrawalFee, // Desired fee to pay. This is a LAYER TWO fee.
      tokenSymbol: 'ETH',
    });

    // Set as signing wallet.
    (layer2Wallet as any).isSigningWallet = true;

    // ? await this.resultHolder.awaitReceiptVerify()
    // : await this.resultHolder.awaitReceipt();

    const fakeReceipt = {
      block: {
        blockNumber: 12,
        committed: true,
        verified: false,
      },
    } as any;

    zkSyncWallet.withdrawFromSyncToEthereum.mockImplementation(async () => {
      const fn = () => Promise.resolve(fakeReceipt);
      return {
        awaitReceipt: fn,
        awaitReceiptVerify: fn,
      } as any;
    });

    // Method under test.
    const result = await layer2Wallet.withdraw(withdrawal);
    const receipt = await result.getReceipt();

    console.log(receipt);

    // Expectations.
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(1);
    expect(receipt.operationType).toEqual(OperationType.Withdrawal);
  });
});
