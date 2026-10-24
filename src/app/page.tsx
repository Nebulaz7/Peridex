'use client';

import React from 'react';
import Link from 'next/link';
import {
  Cpu,
  Layers,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Terminal,
  FileCode,
  Sparkles,
  Database,
  Anchor,
  Share2,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';
import { ALL_PRESETS } from '@/lib/presets';

export default function SchemaStudioPage() {
  const {
    selectedPresetId,
    vmType,
    contractAddress,
    rawJsonInput,
    jsonError,
    normalizedSchema,
    isCompiling,
    compiledSuccess,
    loadPreset,
    setVmType,
    setContractAddress,
    setRawJsonInput,
    compileAndIndex,
    copiedLabel,
    copyToClipboard,
  } = usePeridex();

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* ==================== LEFT: INGESTION STUDIO ==================== */}
      <div className="w-[420px] border-r border-zinc-200 bg-zinc-50/50 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 flex items-center space-x-1.5">
              <span>Schema Ingestion Studio</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Paste ANY Portaldot contract address + either a Solidity ABI or ink! V5 metadata JSON.
            </p>
          </div>

          {/* VM Toggle Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                Target VM Architecture
              </label>
              <span className="text-[11px] font-mono text-zinc-400">Portaldot Dual-VM</span>
            </div>
            <div className="grid grid-cols-2 p-1 bg-zinc-200/60 rounded-md gap-1">
              <button
                type="button"
                onClick={() => setVmType('EVM')}
                className={`py-1.5 text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 ${
                  vmType === 'EVM'
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>EVM Solidity ABI</span>
              </button>
              <button
                type="button"
                onClick={() => setVmType('INK_WASM')}
                className={`py-1.5 text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 ${
                  vmType === 'INK_WASM'
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>WASM ink! Metadata</span>
              </button>
            </div>
          </div>

          {/* Quick-Load Preset Pills */}
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">
              Official Testnet Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className={`px-2.5 py-1 text-xs rounded border transition font-mono ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-zinc-950 font-medium shadow-sm'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    {preset.id === 'erc20'
                      ? 'ERC20 (EVM)'
                      : preset.id === 'staking_ink'
                      ? 'Staking (ink! WASM)'
                      : 'PeridexRegistry (EVM)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contract Identifier Input */}
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase block mb-1">
              Contract Identifier ({vmType === 'EVM' ? '0x Address' : 'Substrate SS58 AccountId'})
            </label>
            <div className="relative">
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder={vmType === 'EVM' ? '0x...' : '5...'}
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
              <button
                onClick={() => copyToClipboard(contractAddress, 'contractAddressInput')}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-900"
                title="Copy address"
              >
                {copiedLabel === 'contractAddressInput' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* JSON Schema Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                {vmType === 'EVM' ? 'Solidity ABI JSON' : 'ink! v5 metadata.json'}
              </label>
              <span className="text-[11px] font-mono">
                {jsonError ? (
                  <span className="text-red-600 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 inline" /> Invalid JSON
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> Valid Schema
                  </span>
                )}
              </span>
            </div>
            <textarea
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full text-[11px] font-mono p-2.5 bg-zinc-100/70 border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white resize-y leading-relaxed"
            />
          </div>

          {/* Action Button: Compile & Index Schema */}
          <div>
            <button
              type="button"
              onClick={compileAndIndex}
              disabled={isCompiling}
              className="w-full py-2.5 px-4 bg-zinc-950 text-white rounded font-medium text-xs hover:bg-zinc-800 active:scale-[0.99] transition flex items-center justify-center space-x-2 shadow-sm"
            >
              {isCompiling ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Normalizing AST & Anchoring...</span>
                </>
              ) : compiledSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Schema Indexed & Anchored On-Chain</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Compile & Index Schema</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== RIGHT: AST & SCHEMA STUDIO ==================== */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        {/* Header Summary Card */}
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-zinc-950">
                {normalizedSchema.contractName}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold ${
                  normalizedSchema.vmType === 'EVM'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {normalizedSchema.vmType === 'EVM' ? 'EVM Solidity' : 'WASM ink! V5'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono">
                Portaldot V3.0
              </span>
            </div>
            <div className="text-xs text-zinc-600 font-mono flex items-center space-x-2">
              <span className="text-zinc-400">Target Address:</span>
              <span className="font-semibold">{normalizedSchema.targetAddress}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(normalizedSchema.schemaHash, 'fullSchemaHash')}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded text-xs font-mono font-medium text-zinc-800 hover:bg-zinc-100 transition flex items-center space-x-1.5"
            >
              {copiedLabel === 'fullSchemaHash' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>Copy Schema Hash ({normalizedSchema.schemaHash.slice(0, 8)}...)</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Cards to Dedicated Pages */}
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-3">
            Generated Outputs & Workspaces
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/endpoints"
              className="p-3 bg-white border border-zinc-200 hover:border-zinc-950 rounded-lg transition group shadow-sm flex flex-col justify-between h-28"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-zinc-900">REST & GraphQL</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Query read methods, build tx payloads, and inspect event streams.
                </p>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-50 px-1.5 py-0.5 rounded w-fit border border-zinc-200">
                {normalizedSchema.readMethods.length + normalizedSchema.writeMethods.length + normalizedSchema.events.length} endpoints active
              </div>
            </Link>

            <Link
              href="/sdk"
              className="p-3 bg-white border border-zinc-200 hover:border-zinc-950 rounded-lg transition group shadow-sm flex flex-col justify-between h-28"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-zinc-900">TypeScript SDK</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Download strongly typed `@peridex/client` with autocomplete.
                </p>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-50 px-1.5 py-0.5 rounded w-fit border border-zinc-200">
                peridex-client.ts ready
              </div>
            </Link>

            <Link
              href="/mcp"
              className="p-3 bg-white border border-zinc-200 hover:border-zinc-950 rounded-lg transition group shadow-sm flex flex-col justify-between h-28"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-zinc-900">AI Agent & MCP</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Model Context Protocol tools and live sandbox trace runner.
                </p>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-50 px-1.5 py-0.5 rounded w-fit border border-zinc-200">
                mcp.json configured
              </div>
            </Link>

            <Link
              href="/finality"
              className="p-3 bg-white border border-zinc-200 hover:border-zinc-950 rounded-lg transition group shadow-sm flex flex-col justify-between h-28"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-zinc-900">Reorg & Finality</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  12-block buffer, GRANDPA finality lag, and 2-block reorg simulation.
                </p>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-50 px-1.5 py-0.5 rounded w-fit border border-zinc-200">
                Sliding-window buffer
              </div>
            </Link>
          </div>
        </div>

        {/* Deep AST Inspection Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Normalized AST Breakdown (Unified Intermediate Representation)
            </h3>
            <div className="flex space-x-2 text-xs font-mono">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                {normalizedSchema.readMethods.length} Read Methods
              </span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                {normalizedSchema.writeMethods.length} Write Methods
              </span>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                {normalizedSchema.events.length} Event Streams
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Read Methods Column */}
            <div className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Read Methods (View / Pure / Query)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  GET
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {normalizedSchema.readMethods.map((m) => (
                  <div
                    key={`read_ast_${m.name}`}
                    className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">{m.name}</span>
                      <span className="text-[10px] text-zinc-400">{m.selector}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Inputs: {m.inputs.length > 0 ? m.inputs.map((i) => `${i.name}: ${i.type}`).join(', ') : 'none'}
                    </div>
                    <div className="text-[11px] text-zinc-600 font-semibold">
                      Returns: {m.outputs.length > 0 ? m.outputs.map((o) => o.type).join(', ') : 'void'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Write Methods Column */}
            <div className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Write Methods (Tx Builders)</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                  POST
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {normalizedSchema.writeMethods.map((m) => (
                  <div
                    key={`write_ast_${m.name}`}
                    className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">{m.name}</span>
                      {m.payable && (
                        <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded font-sans">
                          PAYABLE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Inputs: {m.inputs.length > 0 ? m.inputs.map((i) => `${i.name}: ${i.type}`).join(', ') : 'none'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Produces unsigned {normalizedSchema.vmType === 'EVM' ? 'Keccak calldata' : 'SCALE-encoded message'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Streams Column */}
            <div className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Indexed Event Streams</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                  LOG
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {normalizedSchema.events.map((e) => (
                  <div
                    key={`ev_ast_${e.name}`}
                    className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">{e.name}</span>
                      <span className="text-[10px] text-zinc-400">{e.params.length} fields</span>
                    </div>
                    <div className="text-[11px] text-zinc-600">
                      {e.params.map((p) => (
                        <span key={p.name} className="mr-2 inline-block">
                          {p.name}: <span className="text-zinc-500">{p.type}</span>
                          {p.indexed && <span className="text-purple-600 text-[9px] ml-0.5 font-bold">[idx]</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
