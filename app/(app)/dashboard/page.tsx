'use client';

import Link from 'next/link';
import { PrismButton } from '@/components/ui/prism-button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/common/StatCard';
import { InvoiceCard } from '@/components/invoice/InvoiceCard';
import { useInvoices } from '@/hooks/useInvoices';
import { formatUSDC } from '@/lib/utils';
import { FileText, DollarSign, Clock, CheckCircle, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { invoices, isLoading } = useInvoices();

  // Calculate stats
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingCount = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'draft'
  ).length;
  const paidCount = invoices.filter((inv) => inv.status === 'released').length;

  const recentInvoices = invoices.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/invoices/new" className="hidden md:block">
          <PrismButton>
            <Plus className="h-4 w-4" />
            Create Invoice
          </PrismButton>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoices"
          value={totalInvoices}
          icon={FileText}
        />
        <StatCard
          title="Total Amount"
          value={formatUSDC(totalAmount)}
          icon={DollarSign}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={Clock}
        />
        <StatCard
          title="Paid"
          value={paidCount}
          icon={CheckCircle}
        />
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Invoices</h2>
          <Link href="/invoices" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-muted-foreground mb-4">No invoices yet</p>
            <Link href="/invoices/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first invoice
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
