'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';
import { generateTypeScriptSdk } from '@/lib/sdkGenerator';

export default function SdkStudioPage() {
  const { normalizedSchema, copyToClipboard, copiedLabel } = usePeridex();
  const [activeView, setActiveView] = useState<'client' | 'quickstart'>('client');

  const sdkCode = generateTypeScriptSdk(normalizedSchema);

  const handleDownload = () => {
    const blob = new Blob([sdkCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${normalizedSchema.contractName.toLowerCase()}-client.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sampleQuickstart = `import { create${normalizedSchema.contractName}Client } from './peridex-client';

// 1. Initialize client connected to Portaldot V3.0
const client = create${normalizedSchema.contractName}Client({
  targetAddress: '${normalizedSchema.targetAddress}',
  rpcUrl: '${
    normalizedSchema.vmType === 'EVM'
      ? 'https://test-evm-rpc-v3.portaldot.dev'
      : 'wss://test-node-v3.portaldot.dev'
  }',
});

async function main() {
  // 2. Read state without gas (${normalizedSchema.readMethods[0]?.signature || 'query'})
  const state = await client.read.${normalizedSchema.readMethods[0]?.name || 'query'}({});
  console.log("On-Chain State:", state);

  // 3. Build state-mutating transaction (${normalizedSchema.writeMethods[0]?.signature || 'tx'})
  const txPayload = await client.write.${normalizedSchema.writeMethods[0]?.name || 'execute'}({});
  console.log("Unsigned Transaction Payload:", txPayload);

  // 4. Listen to real-time reorg-safe events (${normalizedSchema.events[0]?.name || 'Transfer'})
  const unsubscribe = client.subscribe.${normalizedSchema.events[0]?.name || 'onEvent'}((event) => {
    console.log("Event confirmed on Portaldot V3.0:", event);
  }, { onlyFinalized: true });
}

main().catch(console.error);`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-zinc-200 px-6 bg-zinc-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex p-0.5 bg-zinc-200/70 rounded border border-zinc-300/60">
            <button
              onClick={() => setActiveView('client')}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                activeView === 'client'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              peridex-client.ts
            </button>
            <button
              onClick={() => setActiveView('quickstart')}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                activeView === 'quickstart'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Integration Quickstart
            </button>
          </div>

          <span className="text-zinc-300">|</span>

          <span className="text-xs font-mono text-zinc-600">
            Package: <code className="bg-zinc-200/60 px-1.5 py-0.5 rounded text-zinc-900 font-bold">@peridex/client</code>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .ts File</span>
          </button>

          <button
            onClick={() => copyToClipboard(activeView === 'client' ? sdkCode : sampleQuickstart, 'sdkCodeMain')}
            className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
          >
            {copiedLabel === 'sdkCodeMain' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Copy Code</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeView === 'quickstart' && (
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-zinc-900" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                How to integrate @peridex/client in your Portaldot V3.0 dApp
              </h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Every contract schema normalized by Peridex generates a dedicated TypeScript client. It handles SCALE/Keccak encoding, RPC calls, and reorg-buffered event listeners with full TypeScript autocomplete.
            </p>
            <div className="p-3 bg-zinc-900 text-zinc-100 rounded font-mono text-xs">
              npm install @peridex/client
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>
              {activeView === 'client'
                ? `Generated TypeScript Client (${normalizedSchema.contractName}Client)`
                : 'example.ts (Integration Pattern)'}
            </span>
            <span>{activeView === 'client' ? `${sdkCode.split('\n').length} lines` : '30 lines'}</span>
          </div>

          <pre className="p-4 bg-zinc-100/90 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 leading-relaxed overflow-x-auto shadow-inner">
            {activeView === 'client' ? sdkCode : sampleQuickstart}
          </pre>
        </div>
      </div>
    </div>
  );
}
