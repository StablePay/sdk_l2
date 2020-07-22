import * as zksync from 'zksync';
import { ZkSyncResult } from '../src/zksync/ZkSyncResult';
import { OperationType, Layer2Type } from '../src/types';
import { Deposit } from '../src/Operation';
import { StablePayLayer2Manager } from '../src/StablePayLayer2Manager';
import { ethers } from 'ethers';

require('dotenv').config();

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

// TODO: enable when mocked providers injected to manager.
xtest('obtain provider', async () => {
  const layer2ProviderManager = StablePayLayer2Manager.Instance;

  // Method under test.
  const provider = await layer2ProviderManager.getProviderByLayer2Type(
    Layer2Type.ZK_SYNC,
    'rinkeby'
  );

  expect(provider.getSupportedLayer2Type()).toBe(Layer2Type.ZK_SYNC);
  expect(provider.getName().length).toBeGreaterThan(0);
});

// TODO: enable when mocked providers injected to manager.
xtest('get balance', async () => {
  const layer2ProviderManager = StablePayLayer2Manager.Instance;

  const provider = await layer2ProviderManager.getProviderByLayer2Type(
    Layer2Type.ZK_SYNC,
    'rinkeby'
  );

  const layer2WalletBuilder = provider.getLayer2WalletBuilder();

  const DO_NOT_REVEAL_THESE_MNEMONICS = process.env.TEST_MNEMONICS;
  expect(DO_NOT_REVEAL_THESE_MNEMONICS).toBeTruthy;

  // Method under test.
  const layer2Wallet = await layer2WalletBuilder.fromMnemonic(
    DO_NOT_REVEAL_THESE_MNEMONICS!
  );

  const address = await layer2Wallet.getAddress();
  console.log(`BOUND ADDRESS ${address}`);

  const balance = await layer2Wallet.getBalance();
  console.log(`Current Wallet Balance: ${balance}`);

  const walletBalances = await layer2Wallet.getAccountBalances();
  console.log(`Balances ${walletBalances.length}`);
  for (const balance of walletBalances) {
    console.log('BALANCE');
    console.log(balance);
  }
});

// TODO: Enable when signer can be mocked simulating blocknative
xtest('layer-2 wallet from custom signer', async () => {
  const layer2ProviderManager = StablePayLayer2Manager.Instance;

  const provider = await layer2ProviderManager.getProviderByLayer2Type(
    Layer2Type.ZK_SYNC,
    'rinkeby'
  );

  // Obtain layer-2 wallet builder.
  const layer2WalletBuilder = provider.getLayer2WalletBuilder();

  // Show how to obtain the ethers Signer.
  const ethersSigner = getMockedSigner();

  // Method under test.
  // Obtain the layer-2 wallet from provider-specific options.
  const layer2Wallet = await layer2WalletBuilder.fromOptions({ ethersSigner });

  // Expectations.
  const balance = await layer2Wallet.getBalance();
  expect(balance).toBeTruthy;
});

function getMockedSigner(): ethers.Signer {
  // TODO: See what's going on here.
  const ethers = require('ethers');

  const ethersProvider = new ethers.getDefaultProvider(
    'rinkeby',
    'rinkebyKeyAPI'
  );

  const DO_NOT_REVEAL_THESE_MNEMONICS = process.env.TEST_MNEMONICS;
  expect(DO_NOT_REVEAL_THESE_MNEMONICS).toBeTruthy;

  // Create ethereum wallet using ethers.js
  console.log('Create ethereum wallet using ethers.js');

  // TODO: Obtain signer from blocknative and provider.
  const ethersWallet = ethers.Wallet.fromMnemonic(
    DO_NOT_REVEAL_THESE_MNEMONICS
  ).connect(ethersProvider);

  return ethersWallet;
}
