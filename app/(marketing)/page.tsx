'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { TrueFocus } from '@/components/ui/true-focus';
import { GlareHover } from '@/components/ui/glare-hover';
import { TiltCard } from '@/components/ui/tilt-card';
import {
  ArrowRight,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  BarChart3,
  Users,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

const Coin3DScene = dynamic(
  () => import('@/components/ui/coin-3d').then((mod) => mod.Coin3DScene),
  { ssr: false }
);

export default function HomePage() {
  // Always use relative path for internal navigation
  const appUrl = '/dashboard';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-new.png"
                alt="Arc Invoice"
                width={180}
                height={44}
                className="h-11 w-auto"
              />
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-white/70 hover:text-white text-sm font-medium transition"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-white/70 hover:text-white text-sm font-medium transition"
              >
                How it works
              </Link>
              <Link
                href="#pricing"
                className="text-white/70 hover:text-white text-sm font-medium transition"
              >
                Pricing
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Button
                asChild
                className="bg-white text-black hover:bg-gray-100"
              >
                <Link href={appUrl}>
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200/50 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-gray-100/50 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge — 3D tilt holographic card */}
            <TiltCard
              className="mb-8"
              glowColor="rgba(168, 130, 255, 0.6)"
              innerGradient="linear-gradient(145deg, #1a1030 0%, #0f1a2e 50%, #0a0f1a 100%)"
            >
              <div className="flex items-center gap-3 px-8 py-5">
                <span className="text-xl">✦</span>
                <span className="text-base md:text-lg font-semibold text-white/90 whitespace-nowrap">
                  EasyA Consensus Hong Kong Hackathon Version
                </span>
              </div>
            </TiltCard>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black leading-tight mb-6">
              Smarter Invoicing
              <br />
              <span className="text-gray-600">
                with <TrueFocus>Escrow Protection</TrueFocus>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Create payment links in seconds. Get paid in USDC with built-in
              escrow protection. No fees on direct payments.
            </p>

            {/* 3D USDC Coin */}
            <div className="flex justify-center mb-10">
              <Coin3DScene className="w-48 h-48 md:w-56 md:h-56" />
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="rounded-full px-8 bg-black hover:bg-gray-800"
                asChild
              >
                <Link href={appUrl}>
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 border-gray-300"
                asChild
              >
                <Link href="#how-it-works">
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-5xl mx-auto">
              {/* Mock Dashboard Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-gray-500 border font-mono">
                    arcinvoice.org/dashboard
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Content */}
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Welcome back</p>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Dashboard
                    </h2>
                  </div>
                  <Button size="sm" className="bg-black hover:bg-gray-800">
                    + New Invoice
                  </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    label="Total Revenue"
                    value="$12,450"
                    change="+12%"
                    positive
                  />
                  <StatCard
                    label="Pending"
                    value="$3,200"
                    change="4 invoices"
                  />
                  <StatCard
                    label="Completed"
                    value="28"
                    change="This month"
                  />
                  <StatCard
                    label="Success Rate"
                    value="96%"
                    change="+2%"
                    positive
                  />
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">
                      Recent Invoices
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <InvoiceRow
                      code="INV-2024"
                      client="Acme Corp"
                      amount="$2,500"
                      status="Paid"
                    />
                    <InvoiceRow
                      code="INV-2023"
                      client="TechStart"
                      amount="$1,800"
                      status="Pending"
                    />
                    <InvoiceRow
                      code="INV-2022"
                      client="DesignHub"
                      amount="$950"
                      status="Funded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-black text-sm font-semibold uppercase tracking-wider">
              ✦ Features
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-black mt-4 mb-4">
              Everything you need to
              <br />
              get paid faster
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Built on Arc blockchain for instant, secure, and transparent
              payments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Escrow Protection"
              description="Funds held securely until work is delivered. Milestone-based releases for large projects."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant Payments"
              description="Sub-second finality on Arc blockchain. Get paid immediately when clients approve."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="Pay with Card"
              description="Clients can pay with Visa, Mastercard, or bank transfer. Coming soon."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Auto-Release"
              description="Automatic fund release after deadline if client doesn't respond. No more waiting."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Analytics Dashboard"
              description="Track revenue, monitor payment status, and export reports with one click."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Client Management"
              description="Save client info, view payment history, and send follow-up reminders."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="py-24 bg-gray-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-black text-sm font-semibold uppercase tracking-wider">
              ✦ How it works
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-black mt-4 mb-4">
              Get paid in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Create Invoice"
              description="Enter amount, description, and choose direct or escrow payment. Generate a unique payment link."
            />
            <StepCard
              number="02"
              title="Share Link"
              description="Send the payment link to your client via email, chat, or any messenger."
            />
            <StepCard
              number="03"
              title="Get Paid"
              description="Client pays in USDC or card. Funds arrive instantly or release from escrow when approved."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-black text-sm font-semibold uppercase tracking-wider">
              ✦ Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-black mt-4 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-600">No monthly fees. Pay only when you use escrow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard
              title="Direct Payment"
              price="0%"
              description="Perfect for trusted clients"
              features={[
                'Instant USDC transfers',
                'Payment link generation',
                'Basic analytics',
                'Unlimited invoices',
              ]}
            />
            <PricingCard
              title="Escrow Payment"
              price="1%"
              description="For new clients & large projects"
              features={[
                'All direct features',
                'Escrow protection',
                'Milestone releases',
                'Auto-release timer',
                'Dispute resolution',
              ]}
              highlighted
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">
            Connect your wallet and create your first invoice in under a minute.
            No signup required.
          </p>
          <Button
            size="lg"
            className="rounded-full px-10 bg-white text-black hover:bg-gray-100"
            asChild
          >
            <Link href={appUrl}>
              Launch App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-new.png"
                alt="Arc Invoice"
                width={160}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 Arc Invoice. Built on Circle&apos;s Arc blockchain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Component: Stat Card
function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-medium text-gray-900 font-mono">{value}</p>
      <p
        className={`text-xs mt-1 ${positive ? 'text-gray-900' : 'text-gray-500'}`}
      >
        {change}
      </p>
    </div>
  );
}

// Component: Invoice Row
function InvoiceRow({
  code,
  client,
  amount,
  status,
}: {
  code: string;
  client: string;
  amount: string;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    Paid: 'bg-gray-900 text-white',
    Pending: 'bg-gray-200 text-gray-700',
    Funded: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm font-mono">{code}</p>
          <p className="text-xs text-gray-500">{client}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-medium text-gray-900 font-mono">{amount}</p>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

// Component: Feature Card
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <GlareHover className="h-full" borderRadius="1rem">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 h-full transition-all hover:shadow-xl hover:border-gray-700">
        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </GlareHover>
  );
}

// Component: Step Card
function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-white text-2xl font-bold">{number}</span>
      </div>
      <h3 className="text-xl font-semibold text-black mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Component: Pricing Card
function PricingCard({
  title,
  price,
  description,
  features,
  highlighted,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? 'bg-black text-white'
          : 'bg-white border border-gray-200'
      }`}
    >
      <h3
        className={`text-xl font-semibold mb-2 ${highlighted ? 'text-white' : 'text-black'}`}
      >
        {title}
      </h3>
      <p
        className={`text-sm mb-4 ${highlighted ? 'text-white/70' : 'text-gray-500'}`}
      >
        {description}
      </p>
      <div className="flex items-baseline gap-1 mb-6">
        <span
          className={`text-5xl font-bold ${highlighted ? 'text-white' : 'text-black'}`}
        >
          {price}
        </span>
        <span
          className={`text-lg ${highlighted ? 'text-white/70' : 'text-gray-500'}`}
        >
          fee
        </span>
      </div>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <CheckCircle2
              className={`w-5 h-5 ${highlighted ? 'text-white' : 'text-black'}`}
            />
            <span className={highlighted ? 'text-white/90' : 'text-gray-700'}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
