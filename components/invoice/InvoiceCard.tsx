'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUSDC } from '@/lib/utils';
import type { Invoice } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  funded: 'bg-blue-500',
  released: 'bg-green-500',
  refunded: 'bg-red-500',
};

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  return (
    <Link href={`/invoices/${invoice.id}`} className="block">
      <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {invoice.short_code}
            </p>
            <p className="font-medium font-mono mt-1">{formatUSDC(invoice.amount)}</p>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {invoice.description}
            </p>
          </div>
          <div className="text-right">
            <Badge className={statusColors[invoice.status]}>
              {invoice.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {invoice.payment_type}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
