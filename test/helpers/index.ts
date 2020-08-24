import { mockDeep, MockProxy } from 'jest-mock-extended';
import { Wallet as ZkSyncWallet, Provider as ZkSyncProvider } from 'zksync';
import { ethers } from 'ethers';

export const buildMockSigner = (): MockProxy<ethers.Signer> & ethers.Signer => {
  return mockDeep<ethers.Signer>();
};

export const buildMockWallet = (): MockProxy<ZkSyncWallet> & ZkSyncWallet => {
  return mockDeep<ZkSyncWallet>();
};

export const buildMockProvider = (): MockProxy<ZkSyncProvider> &
  ZkSyncProvider => {
  return mockDeep<ZkSyncProvider>();
};
