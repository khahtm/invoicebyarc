'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { DirectPayButton } from '@/components/payment/DirectPayButton';
import { TransakPayButton } from '@/components/payment/TransakPayButton';
import { FundEscrowButton } from '@/components/escrow/FundEscrowButton';
import { FundMilestoneButton } from '@/components/escrow/FundMilestoneButton';
import { TermsReview } from '@/components/terms/TermsReview';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import {
  useTermsEscrowStatus,
  useAllDeliverableStatuses,
} from '@/hooks/useTermsEscrowStatus';
import { useDeliverableProofs } from '@/hooks/useDeliverableProofs';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import type { Invoice, Milestone } from '@/types/database';
import type { InvoiceTerms } from '@/types/terms';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting Payment', color: 'bg-yellow-500' },
  funded: { label: 'Funded', color: 'bg-blue-500' },
  released: { label: 'Paid', color: 'bg-green-500' },
  refunded: { label: 'Refunded', color: 'bg-red-500' },
};

export default function PaymentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [terms, setTerms] = useState<InvoiceTerms | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine invoice version
  const isV4 = invoice?.contract_version === 4;
  const isV3 = invoice?.contract_version === 3;

  useEffect(() => {
    fetch(`/api/pay/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(data.invoice);
        }
      })
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setIsLoading(false));
  }, [code]);

  // Fetch milestones for V2/V3 invoices
  const fetchMilestones = useCallback(() => {
    if (invoice?.id) {
      fetch(`/api/invoices/${invoice.id}/milestones`)
        .then((res) => res.json())
        .then((data) => setMilestones(data.milestones || []))
        .catch(() => setMilestones([]));
    }
  }, [invoice?.id]);

  useEffect(() => {
    const hasMilestones =
      invoice?.contract_version === 2 || invoice?.contract_version === 3;
    if (hasMilestones && invoice?.id) {
      fetchMilestones();
    }
  }, [invoice, fetchMilestones]);

  // Fetch terms for V4 invoices
  useEffect(() => {
    if (isV4 && invoice?.id) {
      fetch(`/api/invoices/${invoice.id}/terms`)
        .then((res) => res.json())
        .then((data) => setTerms(data.terms))
        .catch(() => setTerms(null));
    }
  }, [isV4, invoice?.id]);

  // V3 escrow status
  const { currentMilestone, refetch: refetchEscrow } = useEscrowStatus(
    !isV4 ? (invoice?.escrow_address as `0x${string}` | undefined) : undefined,
    invoice?.contract_version
  );

  // V4 escrow status
  const {
    currentDeliverable: v4CurrentDeliverable,
    refetch: refetchV4Status,
  } = useTermsEscrowStatus(
    isV4 ? (invoice?.escrow_address as `0x${string}`) : undefined
  );

  // V4 deliverable proofs (get full proofs array for TermsReview)
  const { proofs } = useDeliverableProofs(isV4 ? invoice?.id ?? null : null);

  // V4 deliverable on-chain statuses
  const { statuses: deliverableStatuses, refetch: refetchDeliverableStatuses } =
    useAllDeliverableStatuses(
      isV4 ? (invoice?.escrow_address as `0x${string}`) : undefined,
      isV4 && terms ? terms.deliverables.length : 0
    );

  const handlePaymentSuccess = async (txHash: string) => {
    try {
      const res = await fetch(`/api/pay/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
          tx_hash: txHash,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invoice');
      }

      toast.success('Payment successful!');
      router.push(`/pay/${code}/success?tx=${txHash}`);
    } catch (err) {
      console.error('Payment update error:', err);
      toast.error('Payment sent! Status update may be delayed.');
      router.push(`/pay/${code}/success?tx=${txHash}`);
    }
  };

  const handlePaymentError = (err: Error) => {
    if (
      err.message?.includes('User rejected') ||
      err.message?.includes('user rejected')
    ) {
      toast.error('Transaction cancelled');
      return;
    }
    toast.error(err.message || 'Payment failed');
  };

  // Handler for Transak fiat payment success
  const handleTransakSuccess = async (orderId: string) => {
    try {
      const res = await fetch(`/api/pay/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
          tx_hash: `transak:${orderId}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invoice');
      }

      toast.success('Payment successful!');
      router.push(`/pay/${code}/success?tx=transak:${orderId}`);
    } catch (err) {
      console.error('Payment update error:', err);
      toast.error('Payment processing. Status update may be delayed.');
      router.push(`/pay/${code}/success?tx=transak:${orderId}`);
    }
  };

  // Handler for V3 milestone funding success
  const handleMilestoneFundSuccess = async (milestoneId: string) => {
    try {
      const res = await fetch(
        `/api/invoices/${invoice?.id}/milestones/${milestoneId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'funded' }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        console.error('Milestone status update failed:', data);
        toast.error(data.error || 'Status update failed');
        return;
      }

      toast.success('Milestone funded!');
      fetchMilestones();
      refetchEscrow();
    } catch (err) {
      console.error('Milestone fund error:', err);
      toast.error('Status update failed');
    }
  };

  // Handler for V4 terms funding success
  const handleV4FundSuccess = async (txHash: string) => {
    try {
      // Refetch status to get UPDATED values from on-chain
      const { data: updatedDetails } = await refetchV4Status();
      await refetchDeliverableStatuses();

      if (!updatedDetails) {
        toast.success('Deliverable funded!');
        return;
      }

      // Use FRESH on-chain values, not stale React state or database values
      // getDetails returns: [0-8]...,[9]deliverableCount,[10]currentDeliverable
      const onChainDeliverableCount = Number(updatedDetails[9]);
      const onChainCurrentDeliverable = Number(updatedDetails[10]);

      const termsDeliverableCount = terms?.deliverables.length ?? 0;

      console.log('[V4 Fund] Comparing:', {
        onChainCurrentDeliverable,
        onChainDeliverableCount,
        termsDeliverableCount,
        allFundedCheck: `${onChainCurrentDeliverable} >= ${onChainDeliverableCount}`,
      });

      // Safety check: contract and database must have same deliverable count
      if (onChainDeliverableCount !== termsDeliverableCount) {
        console.error('[V4 Fund] MISMATCH! Contract has', onChainDeliverableCount,
          'deliverables but terms has', termsDeliverableCount);
        toast.error('Contract/terms deliverable count mismatch. Please contact support.');
        return;
      }

      // After funding, contract increments currentDeliverable
      // All funded when currentDeliverable == deliverableCount
      const allFunded = onChainCurrentDeliverable >= onChainDeliverableCount;

      if (allFunded) {
        // Only mark invoice as funded when ALL deliverables are funded
        await fetch(`/api/pay/${code}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'funded', tx_hash: txHash }),
        });
        // Update React state to reflect funded status
        setInvoice((prev) => (prev ? { ...prev, status: 'funded' } : prev));
        toast.success('All deliverables funded! Invoice complete.');
      } else {
        toast.success(
          `Deliverable ${onChainCurrentDeliverable} of ${onChainDeliverableCount} funded!`
        );
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold text-destructive">
            Invoice Not Found
          </h1>
          <p className="text-muted-foreground mt-2">
            This invoice doesn&apos;t exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  const isPaid = ['released', 'refunded', 'funded'].includes(invoice.status);
  const status = statusConfig[invoice.status] || {
    label: invoice.status,
    color: 'bg-gray-500',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Invoice</p>
            <p className="font-mono font-semibold">{invoice.short_code}</p>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        {/* Amount */}
        <div className="text-center py-8 border-y">
          <p className="text-4xl font-medium font-mono">{formatUSDC(invoice.amount)}</p>
          <p className="text-muted-foreground mt-1">USDC on Arc</p>
        </div>

        {/* Description */}
        <div className="py-4 space-y-1">
          <p className="text-sm font-medium">Description</p>
          <p className="text-muted-foreground">{invoice.description}</p>
        </div>

        {/* Recipient */}
        <div className="py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Paying to:{' '}
            <span className="font-mono text-foreground">
              {truncateAddress(invoice.creator_wallet)}
            </span>
          </p>
        </div>

        {/* Proof of Work - for non-milestone invoices */}
        {invoice.proof_url && !isV3 && !isV4 && (
          <div className="py-4 border-t">
            <p className="text-sm font-medium mb-2">Proof of Work</p>
            <a
              href={invoice.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {invoice.proof_url.length > 40
                ? invoice.proof_url.substring(0, 40) + '...'
                : invoice.proof_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* V4 Terms Review with Per-Deliverable Funding */}
        {isV4 && terms && invoice.escrow_address && !isPaid && (
          <div className="py-4 border-t space-y-4">
            <TermsReview
              terms={terms}
              totalAmount={invoice.amount}
              agreed={termsAgreed}
              onAgree={setTermsAgreed}
              // V4-specific props for per-deliverable funding
              escrowAddress={invoice.escrow_address as `0x${string}`}
              currentDeliverable={v4CurrentDeliverable}
              proofs={proofs}
              deliverableStatuses={deliverableStatuses}
              termsAgreed={termsAgreed}
              onFundSuccess={handleV4FundSuccess}
              onFundError={handlePaymentError}
            />

            <div className="flex justify-center">
              <ConnectButton />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Fund deliverables sequentially after verifying proof of work
            </p>
          </div>
        )}

        {/* V3 Pay-Per-Milestone */}
        {isV3 && milestones.length > 0 && invoice.escrow_address && (
          <div className="py-4 border-t space-y-3">
            <p className="text-sm font-medium">Payment Milestones</p>
            {milestones.map((m, i) => (
              <div key={m.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">
                      {i + 1}. {m.description}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {formatUSDC(m.amount)}
                    </p>
                  </div>
                  <div>
                    {m.status === 'released' ? (
                      <Badge>Released</Badge>
                    ) : m.status === 'funded' ? (
                      <Badge variant="secondary">Funded</Badge>
                    ) : (
                      <FundMilestoneButton
                        escrowAddress={invoice.escrow_address as `0x${string}`}
                        milestoneIndex={i}
                        milestoneAmount={m.amount}
                        isCurrentMilestone={i === currentMilestone}
                        onSuccess={() => handleMilestoneFundSuccess(m.id)}
                      />
                    )}
                  </div>
                </div>
                {m.proof_url && (
                  <a
                    href={m.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-2"
                  >
                    View proof <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Fund milestones sequentially as work is completed
            </p>
          </div>
        )}

        {/* V2 Milestone Breakdown (legacy fund-all-upfront) */}
        {invoice.contract_version === 2 && milestones.length > 0 && (
          <div className="py-4 border-t space-y-2">
            <p className="text-sm font-medium">Payment Milestones</p>
            {milestones.map((m, i) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {i + 1}. {m.description}
                </span>
                <span className="font-medium font-mono">{formatUSDC(m.amount)}</span>
              </div>
            ))}
            <div className="text-xs text-muted-foreground pt-2">
              Funds released milestone-by-milestone after your approval
            </div>
          </div>
        )}

        {/* Payment Actions (for non-V4) */}
        {isPaid ? (
          <div className="mt-4 text-center">
            <p className="text-muted-foreground">
              This invoice has already been {invoice.status}.
            </p>
          </div>
        ) : (
          !isV4 && (
            <div className="space-y-4 mt-4">
              {/* Section Header */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Payment Options
                  </span>
                </div>
              </div>

              {/* Crypto Payment */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <ConnectButton />
                </div>

                {invoice.payment_type === 'direct' && (
                  <DirectPayButton
                    amount={invoice.amount}
                    recipient={invoice.creator_wallet as `0x${string}`}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                )}

                {/* V1/V2: Fund all upfront */}
                {invoice.payment_type === 'escrow' &&
                  invoice.escrow_address &&
                  !isV3 && (
                    <FundEscrowButton
                      escrowAddress={invoice.escrow_address as `0x${string}`}
                      amount={invoice.amount.toString()}
                      contractVersion={invoice.contract_version}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}
              </div>

              {/* Fiat Payment Divider */}
              {!isV3 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      or pay with card
                    </span>
                  </div>
                </div>
              )}

              {/* Fiat Payment - Transak (not for V3 milestone invoices) */}
              {!isV3 && (
                <TransakPayButton
                  amount={invoice.amount}
                  walletAddress={invoice.escrow_address || invoice.creator_wallet}
                  invoiceCode={invoice.short_code}
                  onSuccess={handleTransakSuccess}
                  onError={handlePaymentError}
                />
              )}

              {/* V3: Milestones funded individually via section above */}
              {isV3 && invoice.escrow_address && (
                <p className="text-sm text-muted-foreground text-center">
                  Fund milestones above as work is completed
                </p>
              )}

              {invoice.payment_type === 'escrow' && !invoice.escrow_address && (
                <p className="text-sm text-muted-foreground text-center">
                  Escrow not yet created. Please contact the invoice creator.
                </p>
              )}
            </div>
          )
        )}

        {/* Payment Type Info */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {invoice.payment_type === 'direct'
              ? 'Direct payment - funds sent immediately to recipient'
              : isV4
                ? 'Terms-based escrow - funds held securely, released per deliverable'
                : 'Escrow payment - funds held securely until release'}
          </p>
        </div>
      </Card>
    </div>
  );
}
