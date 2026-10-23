'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code,
  Terminal,
  Cpu,
  Layers,
  Play,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Radio,
  FileCode,
  Database,
  ArrowRight,
  Send,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

import {
  VMType,
  UnifiedContractSchema,
  UnifiedMethod,
  UnifiedEvent,
  BlockRecord,
  McpExecutionTrace,
  ApiExecutionResult,
} from '@/lib/types';
import { parseContractSchema } from '@/lib/parser';
import {
  ALL_PRESETS,
  PRESET_ERC20,
  PRESET_STAKING_INK,
  PRESET_REGISTRY,
  PresetContract,
} from '@/lib/presets';
import { generateTypeScriptSdk } from '@/lib/sdkGenerator';
import { formatMcpJson, generateMcpServerConfig } from '@/lib/mcpGenerator';
import {
  createInitialBlocks,
  executeReorgSimulation,
  simulateApiCall,
  executeMcpPrompt,
  generateContractPrompts,
  generateGraphQLSchema,
} from '@/lib/simulator';

export default function PeridexConsole() {
  // Global Network & Header State
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(1482910);
  const [finalizedLag] = useState<number>(2); // 2 buffered blocks
  const [rpcMode, setRpcMode] = useState<'testnet' | 'anvil'>('testnet');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Active Schema & Editor State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('erc20');
  const [vmType, setVmType] = useState<VMType>('EVM');
  const [contractAddress, setContractAddress] = useState<string>(PRESET_ERC20.address);
  const [rawJsonInput, setRawJsonInput] = useState<string>(PRESET_ERC20.jsonContent);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compiledSuccess, setCompiledSuccess] = useState<boolean>(false);

  // Active Right Pane Tab
  const [activeTab, setActiveTab] = useState<'api' | 'sdk' | 'mcp' | 'reorg'>('api');

  // Tab 1 (API): Sub-view & Tester State
  const [apiSubTab, setApiSubTab] = useState<'rest' | 'graphql'>('rest');
  const [selectedMethod, setSelectedMethod] = useState<{
    type: 'read' | 'write' | 'event';
    item: UnifiedMethod | UnifiedEvent;
  } | null>(null);
  const [endpointInputArgs, setEndpointInputArgs] = useState<Record<string, any>>({});
  const [apiResult, setApiResult] = useState<ApiExecutionResult | null>(null);
  const [isExecutingApi, setIsExecutingApi] = useState<boolean>(false);
  const [apiFilterQuery, setApiFilterQuery] = useState<string>('');

  // Tab 3 (MCP): Agent Sandbox State
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [mcpTraces, setMcpTraces] = useState<McpExecutionTrace[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  // Tab 4 (Reorg): Block Buffer State
  const [blockStream, setBlockStream] = useState<BlockRecord[]>(() => createInitialBlocks(1482910));
  const [reorgActive, setReorgActive] = useState<boolean>(false);
  const [reorgAlert, setReorgAlert] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Block Height Ticker Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBlockHeight((prev) => {
        const next = prev + 1;
        setBlockStream((oldBlocks) => {
          if (reorgActive) return oldBlocks;
          const newBlock: BlockRecord = {
            number: next,
            hash: '0x' + (next * 7919).toString(16).padStart(8, '0') + 'a9f83e201b874c61928e1b4c7',
            parentHash: oldBlocks[0]?.hash || '0x0000',
            vmExecution: next % 2 === 0 ? 'EVM' : 'Dual-VM',
            eventsCount: 1,
            eventsSummary: ['Transfer(0x' + (next % 1000) + '... -> 0x888..., 100 POT)'],
            status: 'Buffered',
            timestamp: new Date().toISOString().split('T')[1].slice(0, 8) + ' UTC',
          };
          const shifted = [newBlock, ...oldBlocks.slice(0, 11)];
          // Finalize older blocks
          return shifted.map((b, i) => (i >= 2 ? { ...b, status: 'Finalized' as const } : b));
        });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [reorgActive]);

  // Normalized Schema derivation
  const normalizedSchema: UnifiedContractSchema = useMemo(() => {
    try {
      setJsonError(null);
      return parseContractSchema(rawJsonInput, vmType, contractAddress);
    } catch (err: any) {
      setJsonError(err.message || 'JSON parse error');
      // Return safe fallback
      return {
        contractName: 'CustomContract',
        vmType,
        targetAddress: contractAddress,
        schemaHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        readMethods: [],
        writeMethods: [],
        events: [],
        rawJson: rawJsonInput,
      };
    }
  }, [rawJsonInput, vmType, contractAddress]);

  // Set default selected method for API tester whenever schema changes
  useEffect(() => {
    if (normalizedSchema.readMethods.length > 0) {
      const defaultRead = normalizedSchema.readMethods[0];
      setSelectedMethod({ type: 'read', item: defaultRead });
      const initialArgs: Record<string, any> = {};
      defaultRead.inputs.forEach((inp) => {
        initialArgs[inp.name] = inp.type === 'address' ? '0x71C8360f3E10D7C014E8C61E70F1C7892927289A' : '0';
      });
      setEndpointInputArgs(initialArgs);
      // Pre-execute a preview
      setApiResult(simulateApiCall(normalizedSchema, 'read', defaultRead.name, initialArgs));
    } else if (normalizedSchema.writeMethods.length > 0) {
      const defaultWrite = normalizedSchema.writeMethods[0];
      setSelectedMethod({ type: 'write', item: defaultWrite });
      const initialArgs: Record<string, any> = {};
      defaultWrite.inputs.forEach((inp) => {
        initialArgs[inp.name] = '100';
      });
      setEndpointInputArgs(initialArgs);
      setApiResult(simulateApiCall(normalizedSchema, 'write', defaultWrite.name, initialArgs));
    }
  }, [normalizedSchema.schemaHash]);

  // Dynamic Prompt Pills for MCP Tab
  const dynamicPrompts = useMemo(() => {
    return generateContractPrompts(normalizedSchema);
  }, [normalizedSchema.contractName, normalizedSchema.vmType]);

  // Handle Preset Selection
  const loadPreset = (preset: PresetContract) => {
    setSelectedPresetId(preset.id);
    setVmType(preset.vmType);
    setContractAddress(preset.address);
    setRawJsonInput(preset.jsonContent);
    setCompiledSuccess(true);
    setTimeout(() => setCompiledSuccess(false), 2000);
  };

  // Handle Manual Compilation / Index Action
  const handleCompileAndIndex = () => {
    setIsCompiling(true);
    setTimeout(() => {
      try {
        parseContractSchema(rawJsonInput, vmType, contractAddress);
        setIsCompiling(false);
        setCompiledSuccess(true);
        setTimeout(() => setCompiledSuccess(false), 2500);
      } catch (err: any) {
        setIsCompiling(false);
        setJsonError(err.message);
      }
    }, 350);
  };

  // Execute API Endpoint Test
  const handleExecuteApiTest = () => {
    if (!selectedMethod) return;
    setIsExecutingApi(true);
    setTimeout(() => {
      const res = simulateApiCall(
        normalizedSchema,
        selectedMethod.type,
        selectedMethod.item.name,
        endpointInputArgs
      );
      setApiResult(res);
      setIsExecutingApi(false);
    }, 120);
  };

  // Run MCP Agent Tool Call
  const handleRunMcpPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAgentRunning(true);
    setTimeout(() => {
      const trace = executeMcpPrompt(promptText, normalizedSchema);
      setMcpTraces((prev) => [trace, ...prev.slice(0, 9)]);
      setIsAgentRunning(false);
      setCustomPrompt('');
    }, 280);
  };

  // Reorg Simulation Handlers
  const triggerReorg = () => {
    const outcome = executeReorgSimulation(blockStream);
    setBlockStream(outcome.updatedBlocks);
    setReorgAlert(outcome.logMessage);
    setReorgActive(true);
  };

  const resetReorg = () => {
    setBlockStream(createInitialBlocks(currentBlockHeight));
    setReorgAlert(null);
    setReorgActive(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-zinc-950 font-sans select-none overflow-hidden">
      {/* ==================== 1. TOP STATUS BAR ==================== */}
      <header className="h-12 border-b border-zinc-200 px-4 flex items-center justify-between bg-white shrink-0 z-20">
        <div className="flex items-center space-x-3">
          {/* Logo / Wordmark */}
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-base text-zinc-950">Peridex</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
              Dual-VM BaaS
            </span>
          </div>

          <span className="text-zinc-300">/</span>

          {/* Network Badge */}
          <div className="flex items-center space-x-1.5 text-xs text-zinc-700 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-medium">portaldot-v3-testnet</span>
            <span className="text-zinc-400 text-[10px]">(ID: 420420777)</span>
          </div>

          {/* Active Schema Hash Badge */}
          <div className="hidden lg:flex items-center space-x-1 text-xs bg-zinc-50 px-2 py-1 rounded border border-zinc-200 font-mono text-zinc-600">
            <span className="text-zinc-400">hash:</span>
            <span className="font-semibold text-zinc-900">{normalizedSchema.schemaHash.slice(0, 10)}...{normalizedSchema.schemaHash.slice(-6)}</span>
            <button
              onClick={() => handleCopy(normalizedSchema.schemaHash, 'schemaHash')}
              className="text-zinc-400 hover:text-zinc-900 ml-1 p-0.5 rounded transition"
              title="Copy full keccak256 schema hash"
            >
              {copiedText === 'schemaHash' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Right Info: Live Block Ticker & Lag & RPC Switch */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Block Ticker */}
          <div className="flex items-center space-x-1.5 font-mono bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
            <Radio className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-500">Block</span>
            <span className="font-semibold text-zinc-900">#{currentBlockHeight.toLocaleString()}</span>
          </div>

          {/* Finality Lag Badge */}
          <div className="flex items-center space-x-1.5 font-mono bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-500">Finalized:</span>
            <span className="font-semibold text-zinc-900">#{(currentBlockHeight - finalizedLag).toLocaleString()}</span>
            <span className="text-zinc-400">|</span>
            <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded text-[11px] font-medium border border-amber-200">
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
              Testnet RPC
            </button>
            <button
              onClick={() => setRpcMode('anvil')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                rpcMode === 'anvil' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Anvil Fork
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 2. MAIN SPLIT PANE ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ==================== LEFT PANE (SCHEMA INGESTION & AST) ==================== */}
        <aside className="w-[390px] border-r border-zinc-200 bg-zinc-50/40 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* VM Toggle Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  Target VM Engine
                </label>
                <span className="text-[11px] font-mono text-zinc-400">Portaldot Dual-VM</span>
              </div>
              <div className="grid grid-cols-2 p-1 bg-zinc-200/60 rounded-md gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setVmType('EVM');
                    if (contractAddress.startsWith('5')) {
                      setContractAddress(PRESET_ERC20.address);
                    }
                  }}
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
                  onClick={() => {
                    setVmType('INK_WASM');
                    if (contractAddress.startsWith('0x')) {
                      setContractAddress(PRESET_STAKING_INK.address);
                    }
                  }}
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
                Preset Contracts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => loadPreset(preset)}
                      className={`px-2 py-1 text-xs rounded border transition font-mono ${
                        isSelected
                          ? 'bg-zinc-950 text-white border-zinc-950 font-medium'
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
                Contract Identifier ({vmType === 'EVM' ? '0x Address' : 'SS58 AccountId'})
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
                  onClick={() => handleCopy(contractAddress, 'contractAddress')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-900"
                  title="Copy address"
                >
                  {copiedText === 'contractAddress' ? (
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
                <span className="text-[11px] font-mono text-zinc-400">
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
                rows={11}
                spellCheck={false}
                className="w-full text-[11px] font-mono p-2.5 bg-zinc-100/70 border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white resize-y"
              />
            </div>

            {/* Action Button: Compile & Index Schema */}
            <div>
              <button
                type="button"
                onClick={handleCompileAndIndex}
                disabled={isCompiling}
                className="w-full py-2 px-4 bg-zinc-950 text-white rounded font-medium text-xs hover:bg-zinc-800 active:scale-[0.99] transition flex items-center justify-center space-x-2"
              >
                {isCompiling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Compiling AST & Anchoring...</span>
                  </>
                ) : compiledSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Schema Indexed On-Chain</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Compile & Index Schema</span>
                  </>
                )}
              </button>
            </div>

            {/* Normalized AST Summary */}
            <div className="pt-2 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  Normalized AST (UIR)
                </span>
                <div className="flex space-x-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    Read: {normalizedSchema.readMethods.length}
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                    Write: {normalizedSchema.writeMethods.length}
                  </span>
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                    Events: {normalizedSchema.events.length}
                  </span>
                </div>
              </div>

              {/* Scrollable Compact AST Tree */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                {normalizedSchema.readMethods.map((m) => (
                  <div
                    key={`read_${m.name}`}
                    className="p-1.5 bg-white border border-zinc-200 rounded flex items-center justify-between text-zinc-700 hover:border-zinc-400 transition cursor-default"
                  >
                    <div className="truncate">
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold mr-1.5">
                        VIEW
                      </span>
                      <span className="font-medium text-zinc-900">{m.name}</span>
                      <span className="text-zinc-400">({m.inputs.map((i) => i.type).join(', ')})</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0 ml-1">
                      {m.selector ? m.selector.slice(0, 6) : ''}
                    </span>
                  </div>
                ))}

                {normalizedSchema.writeMethods.map((m) => (
                  <div
                    key={`write_${m.name}`}
                    className="p-1.5 bg-white border border-zinc-200 rounded flex items-center justify-between text-zinc-700 hover:border-zinc-400 transition cursor-default"
                  >
                    <div className="truncate">
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold mr-1.5">
                        TX
                      </span>
                      <span className="font-medium text-zinc-900">{m.name}</span>
                      <span className="text-zinc-400">({m.inputs.map((i) => i.type).join(', ')})</span>
                    </div>
                    {m.payable && (
                      <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded shrink-0 ml-1">
                        PAYABLE
                      </span>
                    )}
                  </div>
                ))}

                {normalizedSchema.events.map((e) => (
                  <div
                    key={`ev_${e.name}`}
                    className="p-1.5 bg-white border border-zinc-200 rounded flex items-center justify-between text-zinc-700 hover:border-zinc-400 transition cursor-default"
                  >
                    <div className="truncate">
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-purple-100 text-purple-800 rounded font-semibold mr-1.5">
                        EVENT
                      </span>
                      <span className="font-medium text-zinc-900">{e.name}</span>
                      <span className="text-zinc-400">({e.params.length} args)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ==================== RIGHT PANE (OUTPUTS & TESTER) ==================== */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Top Tab Bar */}
          <nav className="h-10 border-b border-zinc-200 px-4 flex items-center justify-between bg-white shrink-0">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('api')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'api'
                    ? 'border-zinc-950 text-zinc-950 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>REST & GraphQL</span>
                <span className="text-[10px] bg-zinc-100 px-1 rounded text-zinc-600">
                  {normalizedSchema.readMethods.length + normalizedSchema.writeMethods.length + normalizedSchema.events.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sdk')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'sdk'
                    ? 'border-zinc-950 text-zinc-950 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>TypeScript SDK</span>
                <span className="text-[10px] bg-zinc-100 px-1 rounded text-zinc-600">@peridex/client</span>
              </button>

              <button
                onClick={() => setActiveTab('mcp')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'mcp'
                    ? 'border-zinc-950 text-zinc-950 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>MCP Server (AI Agent Layer)</span>
                <span className="text-[10px] bg-purple-50 text-purple-700 px-1 rounded border border-purple-200">
                  mcp.json
                </span>
              </button>

              <button
                onClick={() => setActiveTab('reorg')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'reorg'
                    ? 'border-zinc-950 text-zinc-950 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Reorg Buffer & Finality</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-200">
                  {reorgActive ? 'Reorg Alert' : '12 Blocks'}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-zinc-400 text-[11px] font-mono">
                {normalizedSchema.contractName} ({normalizedSchema.vmType})
              </span>
            </div>
          </nav>

          {/* ==================== TAB 1: REST & GRAPHQL ==================== */}
          {activeTab === 'api' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sub-navigation */}
              <div className="h-9 border-b border-zinc-200 px-4 bg-zinc-50 flex items-center justify-between shrink-0">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setApiSubTab('rest')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                      apiSubTab === 'rest'
                        ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    REST Endpoints
                  </button>
                  <button
                    onClick={() => setApiSubTab('graphql')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                      apiSubTab === 'graphql'
                        ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    GraphQL Schema
                  </button>
                </div>

                <div className="text-[11px] font-mono text-zinc-500">
                  Base: <code className="bg-zinc-200/60 px-1.5 py-0.5 rounded text-zinc-800">https://api.peridex.io/v1/portaldot/{normalizedSchema.targetAddress.slice(0, 8)}...</code>
                </div>
              </div>

              {apiSubTab === 'rest' ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Column: Endpoints Directory */}
                  <div className="w-[340px] border-r border-zinc-200 bg-white flex flex-col shrink-0">
                    <div className="p-2 border-b border-zinc-200">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter endpoints..."
                          value={apiFilterQuery}
                          onChange={(e) => setApiFilterQuery(e.target.value)}
                          className="w-full text-xs pl-8 pr-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 font-mono text-xs">
                      {/* Read Endpoints */}
                      <div className="p-2 bg-zinc-50/50 text-[10px] font-sans font-semibold tracking-wider text-zinc-500 uppercase">
                        Read Endpoints (GET)
                      </div>
                      {normalizedSchema.readMethods
                        .filter((m) => m.name.toLowerCase().includes(apiFilterQuery.toLowerCase()))
                        .map((method) => {
                          const isSelected = selectedMethod?.type === 'read' && selectedMethod?.item.name === method.name;
                          return (
                            <button
                              key={`rest_read_${method.name}`}
                              onClick={() => {
                                setSelectedMethod({ type: 'read', item: method });
                                const args: Record<string, any> = {};
                                method.inputs.forEach((inp) => (args[inp.name] = inp.type === 'address' ? '0x71C8360f3E10D7C014E8C61E70F1C7892927289A' : '0'));
                                setEndpointInputArgs(args);
                                setApiResult(simulateApiCall(normalizedSchema, 'read', method.name, args));
                              }}
                              className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                                isSelected ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950' : 'hover:bg-zinc-50 text-zinc-700'
                              }`}
                            >
                              <div className="truncate">
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold mr-1.5">
                                  GET
                                </span>
                                <span>/read/{method.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400">{method.inputs.length} args</span>
                            </button>
                          );
                        })}

                      {/* Write Endpoints */}
                      <div className="p-2 bg-zinc-50/50 text-[10px] font-sans font-semibold tracking-wider text-zinc-500 uppercase">
                        Tx Builders (POST)
                      </div>
                      {normalizedSchema.writeMethods
                        .filter((m) => m.name.toLowerCase().includes(apiFilterQuery.toLowerCase()))
                        .map((method) => {
                          const isSelected = selectedMethod?.type === 'write' && selectedMethod?.item.name === method.name;
                          return (
                            <button
                              key={`rest_write_${method.name}`}
                              onClick={() => {
                                setSelectedMethod({ type: 'write', item: method });
                                const args: Record<string, any> = {};
                                method.inputs.forEach((inp) => (args[inp.name] = '100'));
                                setEndpointInputArgs(args);
                                setApiResult(simulateApiCall(normalizedSchema, 'write', method.name, args));
                              }}
                              className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                                isSelected ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950' : 'hover:bg-zinc-50 text-zinc-700'
                              }`}
                            >
                              <div className="truncate">
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold mr-1.5">
                                  POST
                                </span>
                                <span>/tx/{method.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400">{method.inputs.length} args</span>
                            </button>
                          );
                        })}

                      {/* Event Endpoints */}
                      <div className="p-2 bg-zinc-50/50 text-[10px] font-sans font-semibold tracking-wider text-zinc-500 uppercase">
                        Indexed Event Streams (GET)
                      </div>
                      {normalizedSchema.events
                        .filter((e) => e.name.toLowerCase().includes(apiFilterQuery.toLowerCase()))
                        .map((ev) => {
                          const isSelected = selectedMethod?.type === 'event' && selectedMethod?.item.name === ev.name;
                          return (
                            <button
                              key={`rest_event_${ev.name}`}
                              onClick={() => {
                                setSelectedMethod({ type: 'event', item: ev });
                                setEndpointInputArgs({ limit: 20, finalized: true });
                                setApiResult(simulateApiCall(normalizedSchema, 'event', ev.name, { limit: 20, finalized: true }));
                              }}
                              className={`w-full p-2.5 text-left flex items-center justify-between transition ${
                                isSelected ? 'bg-zinc-100 font-semibold text-zinc-950 border-l-2 border-zinc-950' : 'hover:bg-zinc-50 text-zinc-700'
                              }`}
                            >
                              <div className="truncate">
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold mr-1.5">
                                  EVENT
                                </span>
                                <span>/events/{ev.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400">{ev.params.length} indexed</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Column: Interactive Endpoint Tester */}
                  <div className="flex-1 flex flex-col bg-white overflow-y-auto p-4 space-y-4">
                    {selectedMethod ? (
                      <>
                        {/* Endpoint Title Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                                  selectedMethod.type === 'read'
                                    ? 'bg-blue-100 text-blue-800'
                                    : selectedMethod.type === 'write'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {selectedMethod.type === 'read' ? 'GET' : selectedMethod.type === 'write' ? 'POST' : 'GET'}
                              </span>
                              <span className="font-mono text-sm font-semibold text-zinc-900">
                                {apiResult?.endpoint}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {selectedMethod.item.description || selectedMethod.item.signature}
                            </p>
                          </div>

                          <button
                            onClick={handleExecuteApiTest}
                            disabled={isExecutingApi}
                            className="px-4 py-1.5 bg-zinc-950 text-white rounded text-xs font-medium hover:bg-zinc-800 active:scale-95 transition flex items-center space-x-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isExecutingApi ? 'Executing...' : 'Execute Request'}</span>
                          </button>
                        </div>

                        {/* Arguments Inputs Row */}
                        {'inputs' in selectedMethod.item && selectedMethod.item.inputs.length > 0 && (
                          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                            <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase block mb-2">
                              Request Arguments
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {selectedMethod.item.inputs.map((inp) => (
                                <div key={inp.name}>
                                  <label className="text-xs font-mono text-zinc-700 block mb-1">
                                    {inp.name}{' '}
                                    <span className="text-[10px] text-zinc-400">({inp.type})</span>
                                  </label>
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
                                    className="w-full text-xs font-mono px-2.5 py-1 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Live Response Output Payload */}
                        {apiResult && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-zinc-900">Response Payload</span>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-[11px]">
                                  {apiResult.status} OK
                                </span>
                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded font-mono text-[11px]">
                                  {apiResult.latencyMs}ms
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(JSON.stringify(apiResult.payload, null, 2), 'responseJson')}
                                className="text-zinc-500 hover:text-zinc-900 flex items-center space-x-1"
                              >
                                {copiedText === 'responseJson' ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Copy JSON</span>
                              </button>
                            </div>

                            <pre className="p-3 bg-zinc-100/80 border border-zinc-200 rounded text-[11px] font-mono text-zinc-900 overflow-x-auto max-h-60 leading-relaxed">
                              {JSON.stringify(apiResult.payload, null, 2)}
                            </pre>

                            {/* Generated cURL command */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-500 font-mono text-[11px]">cURL Equivalent</span>
                                <button
                                  onClick={() => handleCopy(apiResult.curlCommand, 'curlCmd')}
                                  className="text-zinc-500 hover:text-zinc-900 flex items-center space-x-1"
                                >
                                  {copiedText === 'curlCmd' ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>Copy cURL</span>
                                </button>
                              </div>
                              <pre className="p-2.5 bg-zinc-950 text-zinc-100 rounded text-[11px] font-mono overflow-x-auto">
                                {apiResult.curlCommand}
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
                /* GraphQL SDL View */
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-700">
                      Auto-Generated Portaldot GraphQL Schema (SDL)
                    </span>
                    <button
                      onClick={() => handleCopy(generateGraphQLSchema(normalizedSchema), 'graphqlSchema')}
                      className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1"
                    >
                      {copiedText === 'graphqlSchema' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy SDL</span>
                    </button>
                  </div>
                  <pre className="flex-1 p-3 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono text-zinc-900 overflow-y-auto leading-relaxed">
                    {generateGraphQLSchema(normalizedSchema)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: TYPESCRIPT SDK ==================== */}
          {activeTab === 'sdk' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 font-mono">
                    peridex-client.ts (@peridex/client)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Strongly-typed client auto-generated for {normalizedSchema.contractName} on Portaldot V3.0
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const code = generateTypeScriptSdk(normalizedSchema);
                      const blob = new Blob([code], { type: 'text/typescript' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${normalizedSchema.contractName.toLowerCase()}-client.ts`;
                      a.click();
                    }}
                    className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ts</span>
                  </button>

                  <button
                    onClick={() => handleCopy(generateTypeScriptSdk(normalizedSchema), 'sdkCode')}
                    className="px-3 py-1 bg-zinc-950 text-white hover:bg-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    {copiedText === 'sdkCode' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy SDK Code</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-3">
                <pre className="p-4 bg-zinc-100/90 border border-zinc-200 rounded text-xs font-mono text-zinc-900 leading-relaxed overflow-x-auto">
                  {generateTypeScriptSdk(normalizedSchema)}
                </pre>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: MCP SERVER (AI AGENT LAYER) ==================== */}
          {activeTab === 'mcp' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: mcp.json Tool Specs */}
              <div className="w-1/2 border-r border-zinc-200 flex flex-col overflow-hidden bg-white">
                <div className="h-10 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70 shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-zinc-900">mcp.json</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                      {generateMcpServerConfig(normalizedSchema).tools.length} Tools
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(formatMcpJson(normalizedSchema), 'mcpJson')}
                    className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center space-x-1"
                  >
                    {copiedText === 'mcpJson' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy mcp.json</span>
                  </button>
                </div>

                <div className="flex-1 p-3 overflow-y-auto">
                  <pre className="p-3 bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-900 leading-relaxed overflow-x-auto">
                    {formatMcpJson(normalizedSchema)}
                  </pre>
                </div>
              </div>

              {/* Right Column: Live MCP Tool-Call Sandbox */}
              <div className="w-1/2 flex flex-col overflow-hidden bg-zinc-50/30">
                <div className="h-10 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                    <span className="text-xs font-semibold text-zinc-900">
                      Live MCP Agent Runner Sandbox
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">Claude / Cursor Compatible</span>
                </div>

                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                  {/* Dynamic Prompt Suggestion Pills */}
                  <div>
                    <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase block mb-1.5">
                      1-Click Dynamic Test Prompts
                    </label>
                    <div className="space-y-1.5">
                      {dynamicPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleRunMcpPrompt(p)}
                          className="w-full text-left p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-xs text-zinc-800 transition flex items-center justify-between group"
                        >
                          <span className="truncate">{p}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Free-Text Prompt Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRunMcpPrompt(customPrompt);
                    }}
                    className="flex space-x-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask the Portaldot AI Agent in natural language..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                    <button
                      type="submit"
                      disabled={isAgentRunning || !customPrompt.trim()}
                      className="px-3 py-1.5 bg-zinc-950 text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ask</span>
                    </button>
                  </form>

                  {/* Execution Trace Feed */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase block">
                      Agent Execution Traces
                    </label>

                    {mcpTraces.length === 0 ? (
                      <div className="p-6 bg-white border border-zinc-200 rounded text-center text-zinc-400 text-xs">
                        Click any prompt above to watch the agent select an MCP tool, query Portaldot V3.0 state, and synthesize a response.
                      </div>
                    ) : (
                      mcpTraces.map((trace) => (
                        <div
                          key={trace.id}
                          className="p-3 bg-white border border-zinc-200 rounded shadow-sm space-y-2.5 text-xs font-sans"
                        >
                          {/* User Prompt */}
                          <div className="font-semibold text-zinc-900 flex items-center space-x-1.5">
                            <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1 rounded font-mono">
                              USER
                            </span>
                            <span>{trace.prompt}</span>
                          </div>

                          {/* Step 1: Tool Selected */}
                          <div className="p-2 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-zinc-500">
                              <span className="font-bold text-zinc-900 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full inline-block" />
                                <span>1. MCP Tool Selected</span>
                              </span>
                              <span>{trace.latencyMs}ms</span>
                            </div>
                            <div className="text-purple-700 font-semibold">{trace.toolName}</div>
                          </div>

                          {/* Step 2: Input Arguments */}
                          <div className="p-2 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                            <span className="font-bold text-zinc-900 block text-zinc-500">
                              2. Tool Input Payload
                            </span>
                            <pre className="text-zinc-700">
                              {JSON.stringify(trace.inputArgs, null, 2)}
                            </pre>
                          </div>

                          {/* Step 3: RPC Execution */}
                          <div className="p-2 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-zinc-500">
                              <span className="font-bold text-zinc-900">
                                3. Portaldot V3.0 State Output
                              </span>
                              <span>Block #{trace.blockNumber}</span>
                            </div>
                            <pre className="text-zinc-700">
                              {JSON.stringify(trace.rpcResult, null, 2)}
                            </pre>
                          </div>

                          {/* Step 4: Agent Synthesis */}
                          <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded text-xs space-y-1">
                            <span className="font-semibold text-zinc-900 flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-950 inline" />
                              <span>4. Agent Synthesis</span>
                            </span>
                            <p className="text-zinc-800 leading-relaxed">{trace.agentSynthesis}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: REORG BUFFER & FINALITY ==================== */}
          {activeTab === 'reorg' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-white">
              {/* Header & Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">
                    Sliding-Window Finality Buffer (Portaldot GRANDPA + Substrate/EVM)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Distinguishes probabilistic unfinalized blocks from finalized blocks to guarantee zero-reorg API consistency.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {reorgActive ? (
                    <button
                      onClick={resetReorg}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded text-xs font-medium transition flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to Canonical Chain</span>
                    </button>
                  ) : (
                    <button
                      onClick={triggerReorg}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Simulate 2-Block Reorg</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Reorg Alert Banner */}
              {reorgAlert && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start space-x-2 shrink-0 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Reorg Reconciled: </span>
                    <span>{reorgAlert}</span>
                  </div>
                </div>
              )}

              {/* Live Sliding-Window Blocks Table */}
              <div className="flex-1 overflow-y-auto mt-3 border border-zinc-200 rounded">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Height</th>
                      <th className="py-2 px-3">Block Hash</th>
                      <th className="py-2 px-3">Parent Hash</th>
                      <th className="py-2 px-3">VM Execution</th>
                      <th className="py-2 px-3">Decoded Events</th>
                      <th className="py-2 px-3 text-right">Finality State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    {blockStream.map((block) => {
                      const isOrphaned = block.status === 'Orphaned';
                      const isBuffered = block.status === 'Buffered';
                      const isFinalized = block.status === 'Finalized';

                      return (
                        <tr
                          key={`${block.number}_${block.hash}`}
                          className={`transition ${
                            isOrphaned
                              ? 'bg-red-50/60 line-through text-zinc-400'
                              : isBuffered
                              ? 'bg-amber-50/30 text-zinc-900'
                              : 'bg-white hover:bg-zinc-50 text-zinc-800'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold">
                            #{block.number.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">
                            {block.hash.slice(0, 10)}...{block.hash.slice(-6)}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {block.parentHash.slice(0, 8)}...
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                                block.vmExecution === 'EVM'
                                  ? 'bg-blue-100 text-blue-800'
                                  : block.vmExecution === 'WASM'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {block.vmExecution}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-zinc-700">
                                {block.eventsCount} events
                              </span>
                              <span className="text-zinc-400 text-[11px] truncate max-w-[200px]">
                                ({block.eventsSummary.join(', ')})
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            {isOrphaned ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[11px] font-medium border border-red-200">
                                Orphaned (Rolled Back)
                              </span>
                            ) : isBuffered ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px] font-medium border border-amber-300 inline-flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-ping" />
                                <span>Buffered (Unfinalized)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded text-[11px] font-medium border border-zinc-200 inline-flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3 text-zinc-700" />
                                <span>Finalized (GRANDPA)</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
