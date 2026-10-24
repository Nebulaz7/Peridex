'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Copy,
  Check,
  Send,
  ArrowRight,
  Terminal,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';
import { formatMcpJson, generateMcpServerConfig } from '@/lib/mcpGenerator';

export default function McpHubPage() {
  const {
    normalizedSchema,
    mcpTraces,
    isAgentRunning,
    runMcpPrompt,
    dynamicPrompts,
    copyToClipboard,
    copiedLabel,
  } = usePeridex();

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [leftTab, setLeftTab] = useState<'mcpJson' | 'claudeConfig'>('mcpJson');

  const mcpJsonStr = formatMcpJson(normalizedSchema);
  const mcpConfig = generateMcpServerConfig(normalizedSchema);

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [`peridex-${normalizedSchema.contractName.toLowerCase()}`]: {
          command: 'npx',
          args: [
            '-y',
            '@peridex/mcp-server',
            '--network',
            'portaldot-v3-testnet',
            '--contract',
            normalizedSchema.targetAddress,
            '--schema-hash',
            normalizedSchema.schemaHash,
          ],
        },
      },
    },
    null,
    2
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* ==================== LEFT: MCP SPEC & TOOLS REGISTRY ==================== */}
      <div className="w-1/2 border-r border-zinc-200 flex flex-col overflow-hidden bg-white">
        {/* Header Bar */}
        <div className="h-11 border-b border-zinc-200 px-4 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="flex p-0.5 bg-zinc-200/70 rounded border border-zinc-300/60">
              <button
                onClick={() => setLeftTab('mcpJson')}
                className={`px-2.5 py-0.5 text-xs font-medium rounded transition ${
                  leftTab === 'mcpJson'
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                mcp.json ({mcpConfig.tools.length} Tools)
              </button>
              <button
                onClick={() => setLeftTab('claudeConfig')}
                className={`px-2.5 py-0.5 text-xs font-medium rounded transition ${
                  leftTab === 'claudeConfig'
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Claude / Cursor Config
              </button>
            </div>
          </div>

          <button
            onClick={() =>
              copyToClipboard(
                leftTab === 'mcpJson' ? mcpJsonStr : claudeDesktopConfig,
                'leftMcpCopy'
              )
            }
            className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center space-x-1"
          >
            {copiedLabel === 'leftMcpCopy' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Copy {leftTab === 'mcpJson' ? 'mcp.json' : 'Config'}</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 p-4 overflow-y-auto">
          {leftTab === 'mcpJson' ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-500">
                Auto-generated Model Context Protocol tools for {normalizedSchema.contractName} ({normalizedSchema.vmType}) on Portaldot V3.0.
              </div>
              <pre className="p-4 bg-zinc-100 border border-zinc-200 rounded-lg text-[11px] font-mono text-zinc-900 leading-relaxed overflow-x-auto">
                {mcpJsonStr}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-zinc-600 leading-relaxed">
                Add this snippet to your <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-900">claude_desktop_config.json</code> or Cursor MCP settings to allow Claude to execute state queries and construct transactions on Portaldot V3.0:
              </div>
              <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto">
                {claudeDesktopConfig}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT: LIVE AGENT RUNNER SANDBOX ==================== */}
      <div className="w-1/2 flex flex-col overflow-hidden bg-zinc-50/40">
        <div className="h-11 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-zinc-900" />
            <span className="text-xs font-bold text-zinc-900">
              Live MCP Agent Runner Sandbox
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Autonomous Portaldot Tool Execution</span>
        </div>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Dynamic 1-Click Prompt Pills */}
          <div>
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">
              1-Click Test Prompts (Auto-Mapped to Contract Tools)
            </label>
            <div className="space-y-1.5">
              {dynamicPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => runMcpPrompt(p)}
                  disabled={isAgentRunning}
                  className="w-full text-left p-2.5 bg-white hover:bg-zinc-100/80 border border-zinc-200 rounded-md text-xs text-zinc-800 transition flex items-center justify-between group shadow-sm disabled:opacity-50"
                >
                  <span className="truncate font-medium">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Query Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runMcpPrompt(customPrompt);
              setCustomPrompt('');
            }}
            className="flex space-x-2"
          >
            <input
              type="text"
              placeholder="Ask the Portaldot AI Agent in natural language..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-white border border-zinc-200 rounded text-zinc-900 focus:outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={isAgentRunning || !customPrompt.trim()}
              className="px-4 py-2 bg-zinc-950 text-white rounded text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3 h-3" />
              <span>{isAgentRunning ? 'Running...' : 'Run Tool'}</span>
            </button>
          </form>

          {/* Execution Trace Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                Step-by-Step Agent Execution Traces
              </label>
              <span className="text-[11px] font-mono text-zinc-400">{mcpTraces.length} traces</span>
            </div>

            {mcpTraces.length === 0 ? (
              <div className="p-8 bg-white border border-zinc-200 rounded-lg text-center text-zinc-400 text-xs space-y-1">
                <Sparkles className="w-5 h-5 mx-auto text-zinc-300 mb-1" />
                <p className="font-medium text-zinc-700">No agent traces yet</p>
                <p>Click any prompt pill above to watch the agent select an MCP tool and query Portaldot V3.0 state.</p>
              </div>
            ) : (
              mcpTraces.map((trace) => (
                <div
                  key={trace.id}
                  className="p-4 bg-white border border-zinc-200 rounded-lg shadow-sm space-y-3 text-xs"
                >
                  {/* User Prompt */}
                  <div className="font-semibold text-zinc-950 flex items-center space-x-2">
                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      USER
                    </span>
                    <span>{trace.prompt}</span>
                  </div>

                  {/* Step 1: Tool Selected */}
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
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
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                    <span className="font-bold text-zinc-500 block">2. Tool Input Payload</span>
                    <pre className="text-zinc-700">
                      {JSON.stringify(trace.inputArgs, null, 2)}
                    </pre>
                  </div>

                  {/* Step 3: RPC Execution */}
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="font-bold text-zinc-900">3. Portaldot V3.0 State Output</span>
                      <span>Block #{trace.blockNumber}</span>
                    </div>
                    <pre className="text-zinc-700">
                      {JSON.stringify(trace.rpcResult, null, 2)}
                    </pre>
                  </div>

                  {/* Step 4: Agent Synthesis */}
                  <div className="p-3 bg-zinc-100 text-zinc-900 rounded text-xs space-y-1">
                    <span className="font-bold text-zinc-950 flex items-center space-x-1">
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
  );
}
