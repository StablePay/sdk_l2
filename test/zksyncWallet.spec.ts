import { mockDeep, MockProxy } from 'jest-mock-extended';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';
import { ethers, BigNumber } from 'ethers';

import { Network, OperationType } from '../src/types';
import { Withdrawal, Transfer, Deposit } from '../src/Operation';
import { Layer2Wallet } from '../src/Layer2Wallet';
import { ZkSyncLayer2Wallet } from '../src/zksync/ZkSyncLayer2Wallet';

require('dotenv').config();

// Define 2-minute timeout.
jest.setTimeout(120_000);

// Global variables to all tests.
const SAMPLE_ADDRESS = '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';
const ETH_BALANCE = BigNumber.from('100000000000000000');
const SAMPLE_NETWORK: Network = 'ropsten';

let ethersSigner: MockProxy<ethers.Signer> & ethers.Signer;
let zkSyncWallet: MockProxy<ZkSyncWallet> & ZkSyncWallet;
let zkSyncProvider: MockProxy<ZkSyncProvider> & ZkSyncProvider;
let layer2Wallet: Layer2Wallet;

describe('zkSync Wallet-related functionality testing', () => {
  // Common setup.
  beforeEach(async () => {
    ethersSigner = mockDeep<ethers.Signer>();
    zkSyncWallet = mockDeep<ZkSyncWallet>();
    zkSyncProvider = mockDeep<ZkSyncProvider>();

    // Obtain the layer-2 wallet from provider-specific options.
    layer2Wallet = new ZkSyncLayer2Wallet(
      SAMPLE_NETWORK,
      zkSyncWallet,
      ethersSigner,
      zkSyncProvider
    );

    // Mock setup.
    zkSyncWallet.address.mockReturnValue(SAMPLE_ADDRESS);
    zkSyncWallet.getBalance.mockReturnValue(Promise.resolve(ETH_BALANCE));
    // Fake upgrade to signing wallet method.
    (layer2Wallet as any).upgradeToSigningWallet = () => Promise.resolve();
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

  it('Should pass correct parameters for DEPOSIT operation', async () => {
    // Test setup.
    // Create DEPOSIT operation.
    const fakeDeposit = Deposit.createTokenDeposit({
      toAddress: SAMPLE_ADDRESS,
      amount: '666.777',
      fee: '0.01',
      tokenSymbol: 'BAT',
      approveForErc20: true,
    });

    // Method under test.
    await layer2Wallet.deposit(fakeDeposit);

    // Expectations.
    expect(zkSyncWallet.depositToSyncFromEthereum).toHaveBeenCalledWith({
      depositTo: fakeDeposit.toAddress,
      token: fakeDeposit.tokenSymbol,
      amount: ethers.utils.parseEther(fakeDeposit.amount),
      approveDepositAmountForERC20: fakeDeposit.approveForErc20,
    });
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
      return Promise.resolve();
    };

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = () => {
      // Simulate account unlock.
      accountLocked = false;
      return Promise.resolve();
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

    // Method under test. Perform TRANSFER operation.
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

    const ERROR_MSG = 'Metamask Cancel';
    // Mock internal zkSync transactional method.
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
    // Check that the zkSync internal methoud was invoked exactly once.
    expect(zkSyncWallet.syncTransfer).toHaveBeenCalledTimes(1);
  });

  it('TRANSFER txn happy path', async () => {
    // Test setup.

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

    const fakeReceipt = {
      block: {
        blockNumber: 18,
        committed: true,
        verified: false,
      },
    } as any;

    // Mock internal zkSync transactional method.
    zkSyncWallet.syncTransfer.mockImplementation(async () => {
      const fn = () => Promise.resolve(fakeReceipt);
      return {
        awaitReceipt: fn,
        awaitReceiptVerify: fn,
      } as any;
    });

    // Method under test.
    const result = await layer2Wallet.transfer(transfer);
    const receipt = await result.getReceipt();

    // Expectations.
    // Check zkSync internal transactional function got called only once.
    expect(zkSyncWallet.syncTransfer).toHaveBeenCalledTimes(1);
    // Check correct receipt data.
    expect(receipt.to).toEqual(transfer.toAddress);
    expect(receipt.tokenSymbol).toEqual(transfer.tokenSymbol);
    expect(receipt.amount).toEqual(transfer.amount);
    expect(receipt.fee).toEqual(transfer.fee);
    expect(receipt.blockNumber).toEqual(fakeReceipt.block.blockNumber);
    expect(receipt.committed).toEqual(fakeReceipt.block.committed);
    expect(receipt.verified).toEqual(fakeReceipt.block.verified);
    // Check the operation performed was a Withdrawal.
    expect(receipt.operationType).toEqual(OperationType.Transfer);
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
      return Promise.resolve();
    };

    // Mock unlockAccount to simulate account unlock. Need to cast to any
    // since this method is private (TS).
    (layer2Wallet as any).unlockAccount = () => {
      // Simulate account unlock.
      accountLocked = false;
      return Promise.resolve();
    };

    // Mock internal zkSync transactional method.
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
    // Check that the account got unlocked.
    expect(accountLocked).toBeFalsy();
    // Check that internal zkSync transactional method got invoked twice.
    // This is exactly on retry after throwing due to locked account.
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

    const ERROR_MSG = 'Metamask Cancel';
    // Mock internal zkSync transactional method.
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
    // Check that the zkSync internal methoud was invoked exactly once.
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(1);
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

    const fakeReceipt = {
      block: {
        blockNumber: 12,
        committed: true,
        verified: false,
      },
    } as any;

    // Mock internal zkSync transactional method.
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

    // Expectations.
    // Check zkSync internal transactional function got called only once.
    expect(zkSyncWallet.withdrawFromSyncToEthereum).toHaveBeenCalledTimes(1);
    // Check correct receipt data.
    expect(receipt.to).toEqual(withdrawal.toAddress);
    expect(receipt.tokenSymbol).toEqual(withdrawal.tokenSymbol);
    expect(receipt.amount).toEqual(withdrawal.amount);
    expect(receipt.fee).toEqual(withdrawal.fee);
    expect(receipt.blockNumber).toEqual(fakeReceipt.block.blockNumber);
    expect(receipt.committed).toEqual(fakeReceipt.block.committed);
    expect(receipt.verified).toEqual(fakeReceipt.block.verified);
    // Check the operation performed was a Withdrawal.
    expect(receipt.operationType).toEqual(OperationType.Withdrawal);
  });
});
