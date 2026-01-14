'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { useTermsEscrowStatus } from '@/hooks/useTermsEscrowStatus';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { USYCInfoModal } from './USYCInfoModal';
import { formatUnits } from 'viem';

interface EscrowStatusProps {
  escrowAddress: `0x${string}`;
  contractVersion?: number;
}

// V1/V2: CREATED, FUNDED, RELEASED, REFUNDED
// V3: CREATED, ACTIVE, COMPLETED, REFUNDED
// V4: CREATED, SIGNED, ACTIVE, COMPLETED, REFUNDED
const stateColors: Record<string, string> = {
  CREATED: 'bg-gray-500',
  SIGNED: 'bg-yellow-500',
  FUNDED: 'bg-blue-500',
  ACTIVE: 'bg-blue-500',
  RELEASED: 'bg-green-500',
  COMPLETED: 'bg-green-500',
  REFUNDED: 'bg-red-500',
};

const V4_STATE_MAP = ['CREATED', 'SIGNED', 'ACTIVE', 'COMPLETED', 'REFUNDED'];

export function EscrowStatus({
  escrowAddress,
  contractVersion = 1,
}: EscrowStatusProps) {
  const isV4 = contractVersion === 4;
  const isV3 = contractVersion === 3;

  // V1/V3 status
  const v1v3Status = useEscrowStatus(
    !isV4 ? escrowAddress : undefined,
    contractVersion
  );

  // V4 status
  const v4Status = useTermsEscrowStatus(isV4 ? escrowAddress : undefined);

  // Normalize status based on version
  const isLoading = isV4 ? !v4Status.status : v1v3Status.isLoading;
  const state = isV4
    ? (v4Status.status ? V4_STATE_MAP[v4Status.status.state] : null)
    : v1v3Status.state;
  const amount = isV4
    ? (v4Status.status ? formatUnits(v4Status.status.totalAmount, 6) : '0')
    : v1v3Status.amount;
  const fundedAmount = isV4
    ? (v4Status.status ? formatUnits(v4Status.status.fundedAmount, 6) : '0')
    : v1v3Status.fundedAmount;
  const payer = isV4
    ? (v4Status.status?.payer !== '0x0000000000000000000000000000000000000000' ? v4Status.status?.payer : null)
    : v1v3Status.payer;
  const fundedAt = isV4
    ? (v4Status.status && v4Status.status.fundedAt > BigInt(0) ? new Date(Number(v4Status.status.fundedAt) * 1000) : null)
    : v1v3Status.fundedAt;
  const autoReleaseDays = isV4
    ? (v4Status.status ? Number(v4Status.status.autoReleaseDays) : 0)
    : v1v3Status.autoReleaseDays;
  const canAutoRelease = isV4 ? v4Status.canAutoRelease : v1v3Status.canAutoRelease;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading escrow status...</p>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Escrow Status</span>
        <Badge className={stateColors[state ?? ''] ?? 'bg-gray-500'}>
          {state ?? 'Unknown'}
        </Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Total Amount</p>
        <p className="font-medium font-mono">{formatUSDC(parseFloat(amount))}</p>
      </div>

      {/* V3/V4: Show funded progress */}
      {(isV3 || isV4) && (
        <div>
          <p className="text-sm text-muted-foreground">Funded</p>
          <p className="font-medium font-mono">
            {formatUSDC(parseFloat(fundedAmount))} / {formatUSDC(parseFloat(amount))}
          </p>
        </div>
      )}

      {payer && (
        <div>
          <p className="text-sm text-muted-foreground">Funded by</p>
          <p className="font-mono text-sm">{truncateAddress(payer)}</p>
        </div>
      )}

      {fundedAt && (
        <div>
          <p className="text-sm text-muted-foreground">First funded at</p>
          <p className="text-sm">{fundedAt.toLocaleDateString()}</p>
        </div>
      )}

      {(state === 'FUNDED' || state === 'ACTIVE') && (
        <div>
          <p className="text-sm text-muted-foreground">Auto-release</p>
          <p className="text-sm">
            {canAutoRelease
              ? 'Available now'
              : `In ${autoReleaseDays} days from first funding`}
          </p>
        </div>
      )}

      {/* USYC Yield Info - show when funds are held */}
      {(state === 'FUNDED' || state === 'ACTIVE') && (
        <div className="pt-2 border-t">
          <USYCInfoModal />
        </div>
      )}
    </Card>
  );
}
