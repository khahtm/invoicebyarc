'use client';

import { useEffect, useState, use } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSDC, truncateAddress, getPaymentUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Invoice } from '@/types/database';
import type { InvoiceTerms } from '@/types/terms';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { ReleaseButton } from '@/components/escrow/ReleaseButton';
import { RefundButton } from '@/components/escrow/RefundButton';
import { CreateEscrowButton } from '@/components/escrow/CreateEscrowButton';
import { ReleaseMilestoneButton } from '@/components/escrow/ReleaseMilestoneButton';
import { ApproveDeliverableButton } from '@/components/escrow/ApproveDeliverableButton';
import { AutoReleaseButton } from '@/components/escrow/AutoReleaseButton';
import { useMilestones } from '@/hooks/useMilestones';
import { useTermsEscrowStatus, useAllDeliverableStatuses } from '@/hooks/useTermsEscrowStatus';
import { useDeliverableProofs } from '@/hooks/useDeliverableProofs';
import { DisputePanel } from '@/components/dispute/DisputePanel';
import { InvoicePdfDownload } from '@/components/invoice/InvoicePdfDownload';
import { MilestoneProofSubmit } from '@/components/invoice/ProofSubmit';
import { DecryptedText } from '@/components/ui/decrypted-text';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  funded: 'bg-blue-500',
  released: 'bg-green-500',
  refunded: 'bg-red-500',
};

// Inline component for proof submission
function DeliverableProofInput({
  index,
  onSubmit,
}: {
  index: number;
  onSubmit: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(url.trim());
      setUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="url"
        placeholder="Proof URL (e.g., drive link, figma, github)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 px-3 py-1 text-sm border rounded bg-background"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleSubmit}
        disabled={!url.trim() || isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Proof'}
      </Button>
    </div>
  );
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address: walletAddress } = useAccount();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [terms, setTerms] = useState<InvoiceTerms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Determine contract version flags
  const isV4 = invoice?.contract_version === 4;
  const hasMilestones = invoice?.contract_version === 2 || invoice?.contract_version === 3;

  // Fetch milestones for v2/v3 contracts
  const { milestones, refetch: refetchMilestones } = useMilestones(
    hasMilestones ? invoice?.id ?? null : null
  );

  // V4: Fetch escrow status
  const { status: v4Status, canAutoRelease: v4CanAutoRelease, refetch: refetchV4Status } = useTermsEscrowStatus(
    isV4 ? (invoice?.escrow_address as `0x${string}` | undefined) : undefined
  );

  // V4: Fetch actual deliverable statuses from contract
  const { statuses: v4DeliverableStatuses, refetch: refetchDeliverableStatuses } = useAllDeliverableStatuses(
    isV4 ? (invoice?.escrow_address as `0x${string}` | undefined) : undefined,
    terms?.deliverables?.length ?? 0
  );

  // V4: Fetch deliverable proofs
  const { proofs: v4Proofs, submitProof: submitV4Proof, hasProofForDeliverable, getProofForDeliverable } = useDeliverableProofs(
    isV4 ? invoice?.id ?? null : null
  );

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(data.invoice);
          if (data.terms) {
            setTerms(data.terms);
          }
        }
      })
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    if (invoice) {
      const paymentUrl = getPaymentUrl(invoice.short_code);
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success('Payment link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReleaseSuccess = async (txHash: string) => {
    try {
      await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'released', tx_hash: txHash }),
      });
      toast.success('Funds released successfully!');
      setInvoice((prev) => prev ? { ...prev, status: 'released', tx_hash: txHash } : null);
    } catch {
      toast.error('Status update failed, but funds were released');
    }
  };

  const handleRefundSuccess = async (txHash: string) => {
    try {
      await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'refunded', tx_hash: txHash }),
      });
      toast.success('Funds refunded successfully!');
      setInvoice((prev) => prev ? { ...prev, status: 'refunded', tx_hash: txHash } : null);
    } catch {
      toast.error('Status update failed, but funds were refunded');
    }
  };

  const handleMilestoneReleaseSuccess = async (milestoneId: string) => {
    // Update milestone status in DB
    try {
      await fetch(`/api/invoices/${id}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'released' }),
      });
      await refetchMilestones();

      // Check if all milestones released
      const allReleased = milestones.every(
        (m) => m.id === milestoneId || m.status === 'released'
      );
      if (allReleased) {
        await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'released' }),
        });
        setInvoice((prev) => (prev ? { ...prev, status: 'released' } : null));
      }
    } catch {
      toast.error('Failed to update milestone status');
    }
  };

  // V4: Handle deliverable approval success
  const handleDeliverableApproveSuccess = async (_txHash: string) => {
    toast.success('Deliverable approved and released!');
    refetchV4Status();
    refetchDeliverableStatuses();
    // Check if all deliverables approved (completed)
    if (v4Status && Number(v4Status.currentDeliverable) >= Number(v4Status.deliverableCount) - 1) {
      await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'released' }),
      });
      setInvoice((prev) => (prev ? { ...prev, status: 'released' } : null));
    }
  };

  const handleEscrowCreated = async (escrowAddress: string, _txHash: string) => {
    try {
      await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrow_address: escrowAddress }),
      });
      toast.success('Escrow contract created!');
      setInvoice((prev) => prev ? { ...prev, escrow_address: escrowAddress } : null);
    } catch {
      toast.error('Failed to save escrow address. Please copy it: ' + escrowAddress);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-bold text-destructive">
            Invoice Not Found
          </h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const paymentUrl = getPaymentUrl(invoice.short_code);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Invoice Details</h1>
            <p className="font-mono text-muted-foreground">
              {invoice.short_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InvoicePdfDownload
            invoice={invoice}
            milestones={hasMilestones ? milestones : undefined}
            terms={isV4 ? terms : undefined}
            deliverableStatuses={isV4 ? v4DeliverableStatuses : undefined}
            size="icon"
          />
          <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
        </div>
      </div>

      {/* Payment Link Card */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h2 className="font-semibold mb-2">Payment Link</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-background px-3 py-2 rounded text-sm break-all font-mono">
            <DecryptedText
              text={paymentUrl}
              animateOn="view"
              sequential={true}
              speed={30}
              revealDirection="start"
              characters="abcdefghijklmnopqrstuvwxyz0123456789/:."
            />
          </code>
          <Button variant="outline" size="icon" onClick={handleCopyLink}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Link href={`/pay/${invoice.short_code}`} target="_blank">
            <Button variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Share this link with your client to receive payment
        </p>
      </Card>

      {/* Invoice Details */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-medium font-mono">{formatUSDC(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Type</p>
            <p className="font-semibold capitalize">{invoice.payment_type}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="mt-1">{invoice.description}</p>
        </div>

        {(invoice.client_name || invoice.client_email) && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Client Info</p>
            {invoice.client_name && <p>{invoice.client_name}</p>}
            {invoice.client_email && (
              <p className="text-muted-foreground">{invoice.client_email}</p>
            )}
          </div>
        )}

        {invoice.payment_type === 'escrow' && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Auto-release</p>
            <p>{invoice.auto_release_days} days after funding</p>
          </div>
        )}

        {invoice.tx_hash && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Transaction</p>
            <a
              href={`https://testnet.arcscan.app/tx/${invoice.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline break-all"
            >
              {invoice.tx_hash}
            </a>
          </div>
        )}

        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>Created: {new Date(invoice.created_at).toLocaleString()}</p>
          <p>Recipient: <span className="font-mono">{truncateAddress(invoice.creator_wallet)}</span></p>
        </div>
      </Card>

      {/* Create Escrow Contract */}
      {invoice.payment_type === 'escrow' && !invoice.escrow_address && (
        <Card className="p-6 space-y-4 border-yellow-500/50 bg-yellow-500/5">
          <h2 className="font-semibold">Create Escrow Contract</h2>
          <p className="text-sm text-muted-foreground">
            Deploy an escrow contract to enable secure payments for this invoice.
            The contract will hold funds until you release them.
          </p>
          <CreateEscrowButton
            invoiceId={invoice.id}
            amount={invoice.amount}
            autoReleaseDays={invoice.auto_release_days || 30}
            milestones={hasMilestones ? milestones : undefined}
            terms={terms}
            contractVersion={invoice.contract_version}
            onSuccess={handleEscrowCreated}
          />
        </Card>
      )}

      {/* Escrow Management */}
      {invoice.payment_type === 'escrow' && invoice.escrow_address && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">
            {isV4 ? 'Terms-Based Escrow' : hasMilestones ? 'Milestone Escrow' : 'Escrow Management'}
          </h2>

          <EscrowStatus
            escrowAddress={invoice.escrow_address as `0x${string}`}
            contractVersion={invoice.contract_version}
          />

          {/* V3: Show milestones with release buttons for funded milestones */}
          {hasMilestones && milestones.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Milestones ({milestones.filter((m) => m.status === 'released').length}/
                {milestones.length} released)
              </h3>
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Milestone {index + 1}: <span className="font-mono">{formatUSDC(milestone.amount)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {milestone.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          milestone.status === 'released'
                            ? 'default'
                            : milestone.status === 'funded'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {milestone.status}
                      </Badge>

                      {/* Creator releases funded milestones (V3: no approval step) */}
                      {milestone.status === 'funded' &&
                        walletAddress?.toLowerCase() === invoice.creator_wallet?.toLowerCase() && (
                          <ReleaseMilestoneButton
                            escrowAddress={invoice.escrow_address as `0x${string}`}
                            milestoneIndex={index}
                            onSuccess={() => handleMilestoneReleaseSuccess(milestone.id)}
                          />
                        )}
                    </div>
                  </div>

                  {/* Proof submission for each milestone */}
                  {milestone.status !== 'pending' && (
                    <MilestoneProofSubmit
                      invoiceId={invoice.id}
                      milestoneId={milestone.id}
                      milestoneIndex={index}
                      currentProofUrl={milestone.proof_url}
                      onSuccess={() => refetchMilestones()}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* V4: Show deliverables with proof submission and release */}
          {isV4 && terms && terms.deliverables.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Deliverables ({v4Status ? Number(v4Status.currentDeliverable) : 0}/
                {terms.deliverables.length} released)
              </h3>
              {terms.deliverables.map((deliverable, index) => {
                // Use actual contract data for funded/released status
                const contractStatus = v4DeliverableStatuses[index];
                const isReleased = contractStatus?.approved ?? false;
                const isFunded = (contractStatus?.funded ?? false) && !isReleased;
                const hasProof = hasProofForDeliverable(index);
                const proofUrl = getProofForDeliverable(index);
                const deliverableAmount = (deliverable.percentageOfTotal / 100) * invoice.amount;
                const isCreator = walletAddress?.toLowerCase() === invoice.creator_wallet?.toLowerCase();

                return (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {deliverable.name}: <span className="font-mono">{formatUSDC(deliverableAmount)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {deliverable.criteria}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isReleased ? 'default' : isFunded ? 'secondary' : hasProof ? 'outline' : 'destructive'
                          }
                        >
                          {isReleased ? 'Released' : isFunded ? 'Funded' : hasProof ? 'Ready' : 'No Proof'}
                        </Badge>

                        {/* Creator can release funded deliverables */}
                        {isFunded && isCreator && (
                          <ApproveDeliverableButton
                            escrowAddress={invoice.escrow_address as `0x${string}`}
                            deliverableIndex={index}
                            onSuccess={handleDeliverableApproveSuccess}
                          />
                        )}
                      </div>
                    </div>

                    {/* Show proof URL if submitted */}
                    {proofUrl && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Proof: </span>
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {proofUrl.length > 40 ? proofUrl.substring(0, 40) + '...' : proofUrl}
                        </a>
                      </div>
                    )}

                    {/* Creator: Submit proof before funding */}
                    {isCreator && !isReleased && !hasProof && (
                      <DeliverableProofInput
                        index={index}
                        onSubmit={async (url) => {
                          const success = await submitV4Proof(index, url);
                          if (success) toast.success(`Proof submitted for deliverable ${index + 1}`);
                          else toast.error('Failed to submit proof');
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* V1: Original release/refund buttons */}
          {!hasMilestones && !isV4 && invoice.status === 'funded' && (
            <div className="flex gap-4 pt-4 border-t">
              <ReleaseButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
                onSuccess={handleReleaseSuccess}
              />
              <RefundButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
                onSuccess={handleRefundSuccess}
              />
            </div>
          )}

          {/* V3: Refund button only (no full release) */}
          {hasMilestones && (invoice.status === 'funded' || invoice.status === 'pending') && (
            <div className="pt-4 border-t">
              <RefundButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
                onSuccess={handleRefundSuccess}
              />
            </div>
          )}

          {/* V4: Refund button (creator can refund) */}
          {isV4 && v4Status?.state === 2 && (
            <div className="pt-4 border-t">
              <RefundButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
                onSuccess={handleRefundSuccess}
              />
            </div>
          )}
        </Card>
      )}

      {/* Dispute Panel */}
      {invoice.payment_type === 'escrow' && invoice.escrow_address && (
        <DisputePanel
          invoiceId={invoice.id}
          invoiceAmount={invoice.amount}
          escrowAddress={invoice.escrow_address as `0x${string}`}
          creatorWallet={invoice.creator_wallet}
          invoiceStatus={invoice.status}
          contractVersion={invoice.contract_version}
          terms={terms}
        />
      )}
    </div>
  );
}
