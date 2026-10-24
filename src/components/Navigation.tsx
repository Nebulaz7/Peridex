'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  Layers,
  Radio,
  ShieldCheck,
  Terminal,
  FileCode,
  Sparkles,
  Database,
  Anchor,
  Copy,
  Check,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';

export default function Navigation() {
  const pathname = usePathname();
  const {
    currentBlockHeight,
    finalizedLag,
    rpcMode,
    setRpcMode,
    normalizedSchema,
    copyToClipboard,
    copiedLabel,
  } = usePeridex();

  const navLinks = [
    {
      href: '/',
      label: 'Schema Studio',
      icon: Layers,
      badge: `${normalizedSchema.vmType}`,
    },
    {
      href: '/endpoints',
      label: 'REST & GraphQL',
      icon: Terminal,
      badge: `${normalizedSchema.readMethods.length + normalizedSchema.writeMethods.length + normalizedSchema.events.length}`,
    },
    {
      href: '/sdk',
      label: 'TypeScript SDK',
      icon: FileCode,
      badge: '@peridex/client',
    },
    {
      href: '/mcp',
      label: 'AI Agent & MCP Hub',
      icon: Sparkles,
      badge: 'mcp.json',
    },
    {
      href: '/finality',
      label: 'Reorg & Finality',
      icon: Database,
      badge: 'GRANDPA',
    },
    {
      href: '/registry',
      label: 'On-Chain Registry',
      icon: Anchor,
      badge: 'Solidity',
    },
  ];

  return (
    <header className="border-b border-zinc-200 bg-white shrink-0 z-30 select-none">
      {/* Upper Status Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center space-x-3">
          {/* Logo / Wordmark */}
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-extrabold tracking-tight text-base text-zinc-950 group-hover:opacity-80 transition">
              Peridex
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
              Dual-VM BaaS
            </span>
          </Link>

          <span className="text-zinc-300">/</span>

          {/* Network Indicator */}
          <div className="flex items-center space-x-1.5 text-xs text-zinc-700 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-medium">portaldot-v3-testnet</span>
            <span className="text-zinc-400 text-[10px] hidden sm:inline">(Chain ID: 420420777)</span>
          </div>

          {/* Active Contract & Schema Hash Badge */}
          <div className="hidden md:flex items-center space-x-2 text-xs bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200 font-mono">
            <span className="text-zinc-500 font-medium">{normalizedSchema.contractName}</span>
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-400">hash:</span>
            <span className="text-zinc-900 font-semibold">
              {normalizedSchema.schemaHash.slice(0, 8)}...{normalizedSchema.schemaHash.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(normalizedSchema.schemaHash, 'schemaHashNav')}
              className="text-zinc-400 hover:text-zinc-900 ml-1"
              title="Copy schema hash"
            >
              {copiedLabel === 'schemaHashNav' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Right Info: Live Block Ticker & Lag & RPC Switch */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Block Ticker */}
          <div className="flex items-center space-x-1.5 font-mono bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
            <Radio className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-500 hidden sm:inline">Block</span>
            <span className="font-semibold text-zinc-900">#{currentBlockHeight.toLocaleString()}</span>
          </div>

          {/* Finality Lag Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 font-mono bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-500">Finalized:</span>
            <span className="font-semibold text-zinc-900">
              #{(currentBlockHeight - finalizedLag).toLocaleString()}
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-amber-800 bg-amber-50 px-1 py-0.2 rounded text-[11px] font-medium border border-amber-200">
              Buffered: {finalizedLag}
            </span>
          </div>

          {/* RPC Mode Switch */}
          <div className="flex items-center p-0.5 bg-zinc-100 rounded border border-zinc-200">
            <button
              onClick={() => setRpcMode('testnet')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                rpcMode === 'testnet' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => setRpcMode('anvil')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                rpcMode === 'anvil' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Anvil
            </button>
          </div>
        </div>
      </div>

      {/* Primary Multi-Page Navigation Bar */}
      <nav className="h-10 px-4 flex items-center space-x-1 overflow-x-auto bg-white">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-xs rounded font-medium transition flex items-center space-x-2 shrink-0 ${
                isActive
                  ? 'bg-zinc-950 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                {link.badge}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
