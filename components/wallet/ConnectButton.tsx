'use client';

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContract,
  useChainId,
} from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, Check, AlertTriangle } from 'lucide-react';
import { truncateAddress, formatUSDC } from '@/lib/utils';
import { arcTestnet } from '@/lib/chains/arc';
import { toast } from 'sonner';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function ConnectButton() {
  // IMPORTANT: Use chainId from useAccount (actual wallet chain), not useChainId (wagmi config)
  const { address, isConnected, connector, chainId } = useAccount();
  const configChainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [copied, setCopied] = useState(false);

  // Fetch USDC balance
  const { data: usdcBalance } = useReadContract({
    address: getContractAddress(configChainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // Format balance (USDC has 6 decimals)
  const formattedBalance =
    usdcBalance !== undefined
      ? formatUSDC(Number(usdcBalance) / 1e6)
      : '...';

  // Add Arc testnet to wallet if not present
  const addArcTestnet = useCallback(async () => {
    if (!connector) return;

    try {
      const provider = await connector.getProvider();
      await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${arcTestnet.id.toString(16)}`,
            chainName: arcTestnet.name,
            nativeCurrency: arcTestnet.nativeCurrency,
            rpcUrls: [arcTestnet.rpcUrls.default.http[0]],
            blockExplorerUrls: [arcTestnet.blockExplorers?.default.url],
          },
        ],
      });
      toast.success('Arc Testnet added to wallet');
    } catch (error) {
      console.error('Failed to add chain:', error);
    }
  }, [connector]);

  // Auto-switch to Arc testnet when connected to wrong chain
  useEffect(() => {
    if (isConnected && chainId !== arcTestnet.id) {
      switchChain(
        { chainId: arcTestnet.id },
        {
          onError: () => {
            // Chain not found, try to add it
            addArcTestnet();
          },
        }
      );
    }
  }, [isConnected, chainId, switchChain, addArcTestnet]);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;

  // Handle manual switch - always try to add chain first, then switch
  const handleSwitchNetwork = async () => {
    // First add the chain (if already exists, wallet ignores this)
    await addArcTestnet();
    // Then switch to it
    switchChain({ chainId: arcTestnet.id });
  };

  // Show wrong network warning with switch button
  if (isConnected && address && isWrongNetwork) {
    return (
      <Button
        variant="destructive"
        onClick={handleSwitchNetwork}
        className="gap-2"
      >
        <AlertTriangle className="h-4 w-4" />
        Switch to Arc
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="font-mono">{truncateAddress(address)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {/* Balance display */}
          <div className="px-2 py-2 text-center">
            <p className="text-xs text-muted-foreground">USDC Balance</p>
            <p className="text-lg font-medium font-mono">{formattedBalance}</p>
          </div>
          <DropdownMenuSeparator />
          {/* Address with copy */}
          <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-sm">{truncateAddress(address, 6)}</span>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Connect with Arc testnet chain specified
  const handleConnect = () => {
    connect(
      { connector: connectors[0], chainId: arcTestnet.id },
      {
        onError: () => {
          // If fails (chain not found), connect anyway then add chain
          connect({ connector: connectors[0] });
        },
      }
    );
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isPending}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
