import { describe, it, expect, vi } from 'vitest';
import {
  monadConfig,
  formatMON,
  shortAddress,
  getConnectedChainId,
  verifyMonadNetwork,
  getMonadBalance,
  publicClient,
} from '../services/monadRpc';

describe('Monad Testnet Configuration & RPC Service', () => {
  it('has correct Monad Testnet parameters for Chain ID 10143 and Faucet URL', () => {
    expect(monadConfig.chainId).toBe(10143);
    expect(monadConfig.hexChainId).toBe('0x279f');
    expect(monadConfig.rpcUrl).toBe('https://testnet-rpc.monad.xyz');
    expect(monadConfig.faucetUrl).toBe('https://faucet.monad.xyz/');
    expect(monadConfig.currencySymbol).toBe('MON');
    expect(monadConfig.decimals).toBe(18);
  });

  it('exports shared MONAD_TESTNET network constant matching spec', async () => {
    const { MONAD_TESTNET } = await import('../config/monad');
    expect(MONAD_TESTNET.chainId).toBe(10143);
    expect(MONAD_TESTNET.chainIdHex).toBe('0x279f');
    expect(MONAD_TESTNET.name).toBe('Monad Testnet');
    expect(MONAD_TESTNET.rpcUrl).toBe('https://testnet-rpc.monad.xyz');
    expect(MONAD_TESTNET.faucetUrl).toBe('https://faucet.monad.xyz/');
    expect(MONAD_TESTNET.nativeCurrency.symbol).toBe('MON');
    expect(MONAD_TESTNET.nativeCurrency.decimals).toBe(18);
  });

  describe('formatMON', () => {
    it('formats 0 wei correctly', () => {
      expect(formatMON(0n)).toBe('0.0000 MON');
    });

    it('formats 1 full MON correctly (1e18 wei)', () => {
      expect(formatMON(1000000000000000000n)).toBe('1.0000 MON');
    });

    it('formats fractional MON with 4 decimal places without floating-point error', () => {
      expect(formatMON(1523400000000000000n)).toBe('1.5234 MON');
      expect(formatMON(50000000000000000n)).toBe('0.0500 MON');
      expect(formatMON(1234567890123456789n)).toBe('1.2345 MON');
    });

    it('formats tiny wei amounts below 4 decimal threshold', () => {
      expect(formatMON(1000n)).toBe('0.0000 MON');
      expect(formatMON(99999999999999n)).toBe('0.0000 MON');
    });
  });

  describe('shortAddress', () => {
    it('truncates standard 42-char ethereum address safely', () => {
      expect(shortAddress('0x71F00000000000000000000000000000000092A4')).toBe('0x71F0...92A4');
    });

    it('returns empty string for null or empty input', () => {
      expect(shortAddress('')).toBe('');
      expect(shortAddress(null)).toBe('');
      expect(shortAddress(undefined)).toBe('');
    });

    it('returns short strings without modification', () => {
      expect(shortAddress('0x123')).toBe('0x123');
    });
  });

  describe('getConnectedChainId & verifyMonadNetwork', () => {
    it('queries Monad Testnet RPC and confirms Chain ID 10143', async () => {
      const getChainIdSpy = vi.spyOn(publicClient, 'getChainId').mockResolvedValueOnce(10143);
      const chainId = await getConnectedChainId();
      expect(chainId).toBe(10143);
      getChainIdSpy.mockRestore();
    });

    it('verifyMonadNetwork resolves Chain ID 10143 without error', async () => {
      const getChainIdSpy = vi.spyOn(publicClient, 'getChainId').mockResolvedValueOnce(10143);
      const chainId = await verifyMonadNetwork();
      expect(chainId).toBe(10143);
      getChainIdSpy.mockRestore();
    });

    it('verifyMonadNetwork rejects on mismatched chain ID', async () => {
      const getChainIdSpy = vi.spyOn(publicClient, 'getChainId').mockResolvedValueOnce(1);
      await expect(verifyMonadNetwork()).rejects.toThrow(/Unexpected network/);
      getChainIdSpy.mockRestore();
    });
  });

  describe('getMonadBalance (RPC Balance Query)', () => {
    it('queries address safely from RPC client and formats result', async () => {
      const zeroAddr = '0x0000000000000000000000000000000000000000';
      const balanceSpy = vi.spyOn(publicClient, 'getBalance').mockResolvedValueOnce(2500000000000000000n);
      const result = await getMonadBalance(zeroAddr);
      expect(result.address).toBe(zeroAddr);
      expect(result.balanceWei).toBe(2500000000000000000n);
      expect(result.balanceMON).toBe('2.5');
      expect(result.balanceFormatted).toBe('2.5000 MON');
      balanceSpy.mockRestore();
    });

    it('rejects invalid address format before network call', async () => {
      await expect(getMonadBalance('not-an-eth-address' as `0x${string}`)).rejects.toThrow(
        /Invalid EVM address/
      );
    });
  });

  describe('Transaction Verification & Explorer URLs', () => {
    it('builds explorer transaction URL matching Monad Testnet explorer', async () => {
      const { getExplorerTxUrl } = await import('../services/monadRpc');
      const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(getExplorerTxUrl(hash)).toBe(
        `https://testnet.monadexplorer.com/tx/${hash}`
      );
    });

    it('verifies on-chain transaction receipt status from publicClient', async () => {
      const { waitForTransactionConfirmation } = await import('../services/monadRpc');
      const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const waitSpy = vi.spyOn(publicClient, 'waitForTransactionReceipt').mockResolvedValueOnce({
        status: 'success',
        blockNumber: 42100n,
        transactionHash: mockHash,
        gasUsed: 21000n,
      } as any);

      const result = await waitForTransactionConfirmation(mockHash);
      expect(result.isSuccess).toBe(true);
      expect(result.status).toBe('success');
      expect(result.blockNumber).toBe(42100n);
      expect(result.transactionHash).toBe(mockHash);
      waitSpy.mockRestore();
    });
  });
});

