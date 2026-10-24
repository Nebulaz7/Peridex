'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Search,
  CheckCircle2,
  FileCode,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';
import { UnifiedMethod, UnifiedEvent, ApiExecutionResult } from '@/lib/types';
import { simulateApiCall, generateGraphQLSchema } from '@/lib/simulator';

export default function EndpointsPage() {
  const { normalizedSchema, copyToClipboard, copiedLabel } = usePeridex();

  const [subTab, setSubTab] = useState<'rest' | 'graphql'>('rest');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<{
    type: 'read' | 'write' | 'event';
    item: UnifiedMethod | UnifiedEvent;
  } | null>(null);
  const [endpointInputArgs, setEndpointInputArgs] = useState<Record<string, any>>({});
  const [apiResult, setApiResult] = useState<ApiExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [codeSnippetTab, setCodeSnippetTab] = useState<'curl' | 'ts'>('curl');

  // Initialize selected method when schema changes
  useEffect(() => {
    if (normalizedSchema.readMethods.length > 0) {
      const defaultRead = normalizedSchema.readMethods[0];
      setSelectedMethod({ type: 'read', item: defaultRead });
      const args: Record<string, any> = {};
      defaultRead.inputs.forEach((inp) => {
        args[inp.name] = inp.type === 'address' ? '0x71C8360f3E10D7C014E8C61E70F1C7892927289A' : '0';
      });
      setEndpointInputArgs(args);
      setApiResult(simulateApiCall(normalizedSchema, 'read', defaultRead.name, args));
    } else if (normalizedSchema.writeMethods.length > 0) {
      const defaultWrite = normalizedSchema.writeMethods[0];
      setSelectedMethod({ type: 'write', item: defaultWrite });
      const args: Record<string, any> = {};
      defaultWrite.inputs.forEach((inp) => (args[inp.name] = '100'));
      setEndpointInputArgs(args);
      setApiResult(simulateApiCall(normalizedSchema, 'write', defaultWrite.name, args));
    }
  }, [normalizedSchema.schemaHash]);

  const handleExecute = () => {
    if (!selectedMethod) return;
    setIsExecuting(true);
    setTimeout(() => {
      const res = simulateApiCall(
        normalizedSchema,
        selectedMethod.type,
        selectedMethod.item.name,
        endpointInputArgs
      );
      setApiResult(res);
      setIsExecuting(false);
    }, 130);
  };

  const getTsSnippet = () => {
    if (!selectedMethod || !apiResult) return '';
    if (selectedMethod.type === 'read') {
      return `// TypeScript fetch client
const response = await fetch("https://api.peridex.io${apiResult.endpoint}", {
  headers: {
    "Accept": "application/json",
    "x-peridex-key": "pdx_live_sec_8921"
  }
});
const data = await response.json();
console.log(data);`;
    } else if (selectedMethod.type === 'write') {
      return `// Unsigned Transaction Payload Builder
const response = await fetch("https://api.peridex.io${apiResult.endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-peridex-key": "pdx_live_sec_8921"
  },
  body: JSON.stringify(${JSON.stringify(endpointInputArgs, null, 2)})
});
const txPayload = await response.json();
// Broadcast via MetaMask (EVM) or SubWallet / Polkadot.js (ink! WASM)
console.log(txPayload);`;
    } else {
      return `// WebSocket / REST Event Poller
const response = await fetch("https://api.peridex.io${apiResult.endpoint}", {
  headers: { "Accept": "application/json" }
});
const events = await response.json();
console.log(events);`;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Sub Header & Switch */}
      <div className="h-11 border-b border-zinc-200 px-6 bg-zinc-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex p-0.5 bg-zinc-200/70 rounded border border-zinc-300/60">
            <button
              onClick={() => setSubTab('rest')}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                subTab === 'rest'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              REST API Endpoints
            </button>
            <button
              onClick={() => setSubTab('graphql')}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                subTab === 'graphql'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              GraphQL Schema (SDL)
            </button>
          </div>

          <span className="text-zinc-300">|</span>

          <span className="text-xs text-zinc-600 font-mono">
            Contract: <span className="font-semibold text-zinc-900">{normalizedSchema.contractName}</span> ({normalizedSchema.targetAddress.slice(0, 8)}...)
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Edge Cache Active (14ms latency)</span>
        </div>
      </div>

      {subTab === 'rest' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Endpoints Directory */}
          <div className="w-[360px] border-r border-zinc-200 bg-white flex flex-col shrink-0">
            <div className="p-3 border-b border-zinc-200 bg-zinc-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter endpoints..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 font-mono text-xs">
              {/* Read Section */}
              <div className="p-2.5 bg-zinc-50/80 text-[10px] font-sans font-bold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                <span>Read Endpoints</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono">
                  {normalizedSchema.readMethods.length} GET
                </span>
              </div>
              {normalizedSchema.readMethods
                .filter((m) => m.name.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((m) => {
                  const isSelected = selectedMethod?.type === 'read' && selectedMethod?.item.name === m.name;
                  return (
                    <button
                      key={`ep_read_${m.name}`}
                      onClick={() => {
                        setSelectedMethod({ type: 'read', item: m });
                        const args: Record<string, any> = {};
                        m.inputs.forEach((inp) => (args[inp.name] = inp.type === 'address' ? '0x71C8360f3E10D7C014E8C61E70F1C7892927289A' : '0'));
                        setEndpointInputArgs(args);
                        setApiResult(simulateApiCall(normalizedSchema, 'read', m.name, args));
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold mr-1.5">
                          GET
                        </span>
                        <span>/read/{m.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{m.inputs.length} args</span>
                    </button>
                  );
                })}

              {/* Write Section */}
              <div className="p-2.5 bg-zinc-50/80 text-[10px] font-sans font-bold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                <span>Transaction Builders</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono">
                  {normalizedSchema.writeMethods.length} POST
                </span>
              </div>
              {normalizedSchema.writeMethods
                .filter((m) => m.name.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((m) => {
                  const isSelected = selectedMethod?.type === 'write' && selectedMethod?.item.name === m.name;
                  return (
                    <button
                      key={`ep_write_${m.name}`}
                      onClick={() => {
                        setSelectedMethod({ type: 'write', item: m });
                        const args: Record<string, any> = {};
                        m.inputs.forEach((inp) => (args[inp.name] = '100'));
                        setEndpointInputArgs(args);
                        setApiResult(simulateApiCall(normalizedSchema, 'write', m.name, args));
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold mr-1.5">
                          POST
                        </span>
                        <span>/tx/{m.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{m.inputs.length} args</span>
                    </button>
                  );
                })}

              {/* Events Section */}
              <div className="p-2.5 bg-zinc-50/80 text-[10px] font-sans font-bold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                <span>Event Log Streams</span>
                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-mono">
                  {normalizedSchema.events.length} LOG
                </span>
              </div>
              {normalizedSchema.events
                .filter((e) => e.name.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((e) => {
                  const isSelected = selectedMethod?.type === 'event' && selectedMethod?.item.name === e.name;
                  return (
                    <button
                      key={`ep_event_${e.name}`}
                      onClick={() => {
                        setSelectedMethod({ type: 'event', item: e });
                        setEndpointInputArgs({ limit: 20, finalized: true });
                        setApiResult(simulateApiCall(normalizedSchema, 'event', e.name, { limit: 20, finalized: true }));
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold mr-1.5">
                          EVENT
                        </span>
                        <span>/events/{e.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{e.params.length} indexed</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Interactive Tester Workspace */}
          <div className="flex-1 flex flex-col bg-white overflow-y-auto p-6 space-y-5">
            {selectedMethod ? (
              <>
                {/* Method Title Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                          selectedMethod.type === 'read'
                            ? 'bg-blue-100 text-blue-800'
                            : selectedMethod.type === 'write'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {selectedMethod.type === 'read' ? 'GET' : selectedMethod.type === 'write' ? 'POST' : 'GET'}
                      </span>
                      <span className="font-mono text-sm font-bold text-zinc-900">
                        {apiResult?.endpoint}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">
                      Signature: {selectedMethod.item.signature}
                    </p>
                  </div>

                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="px-5 py-2 bg-zinc-950 text-white rounded text-xs font-medium hover:bg-zinc-800 active:scale-95 transition flex items-center space-x-2 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isExecuting ? 'Querying Portaldot Node...' : 'Execute Request'}</span>
                  </button>
                </div>

                {/* Input Parameters Box */}
                {'inputs' in selectedMethod.item && selectedMethod.item.inputs.length > 0 && (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
                    <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase block">
                      Path & Query Arguments
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMethod.item.inputs.map((inp) => (
                        <div key={inp.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-semibold text-zinc-900">{inp.name}</span>
                            <span className="text-zinc-400 text-[11px]">{inp.type}</span>
                          </div>
                          <input
                            type="text"
                            value={endpointInputArgs[inp.name] ?? ''}
                            onChange={(e) =>
                              setEndpointInputArgs({
                                ...endpointInputArgs,
                                [inp.name]: e.target.value,
                              })
                            }
                            placeholder={inp.description || inp.type}
                            className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Response & Payload Viewer */}
                {apiResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-zinc-900">Decoded Response Body</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-[11px] font-semibold">
                          {apiResult.status} OK
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded font-mono text-[11px]">
                          {apiResult.latencyMs}ms
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(apiResult.payload, null, 2), 'responsePayload')}
                        className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center space-x-1"
                      >
                        {copiedLabel === 'responsePayload' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copy JSON</span>
                      </button>
                    </div>

                    <pre className="p-4 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 overflow-x-auto max-h-72 leading-relaxed">
                      {JSON.stringify(apiResult.payload, null, 2)}
                    </pre>

                    {/* Code Snippets (cURL / TypeScript) */}
                    <div className="pt-2 border-t border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCodeSnippetTab('curl')}
                            className={`px-2.5 py-1 text-xs font-mono rounded transition ${
                              codeSnippetTab === 'curl'
                                ? 'bg-zinc-950 text-white font-medium'
                                : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                          >
                            cURL
                          </button>
                          <button
                            onClick={() => setCodeSnippetTab('ts')}
                            className={`px-2.5 py-1 text-xs font-mono rounded transition ${
                              codeSnippetTab === 'ts'
                                ? 'bg-zinc-950 text-white font-medium'
                                : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                          >
                            TypeScript fetch
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              codeSnippetTab === 'curl' ? apiResult.curlCommand : getTsSnippet(),
                              'codeSnippet'
                            )
                          }
                          className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center space-x-1 font-mono"
                        >
                          {copiedLabel === 'codeSnippet' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy Snippet</span>
                        </button>
                      </div>

                      <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                        {codeSnippetTab === 'curl' ? apiResult.curlCommand : getTsSnippet()}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
                Select an endpoint from the left directory to test.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GraphQL SDL Tab */
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-zinc-900">
                GraphQL Schema SDL for {normalizedSchema.contractName} ({normalizedSchema.vmType})
              </h3>
              <p className="text-[11px] text-zinc-500">
                Auto-generated GraphQL types, queries for read methods, mutations for tx builders, and subscriptions for events.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(generateGraphQLSchema(normalizedSchema), 'graphqlSdl')}
              className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
            >
              {copiedLabel === 'graphqlSdl' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy GraphQL SDL</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4">
            <pre className="p-4 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 leading-relaxed overflow-x-auto">
              {generateGraphQLSchema(normalizedSchema)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
