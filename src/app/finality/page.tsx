'use client';

import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Radio,
  Layers,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';
import { BlockRecord } from '@/lib/types';

export default function FinalityPage() {
  const {
    currentBlockHeight,
    finalizedLag,
    blockStream,
    reorgActive,
    reorgAlert,
    triggerReorg,
    resetReorg,
    copyToClipboard,
    copiedLabel,
  } = usePeridex();

  const [selectedBlock, setSelectedBlock] = useState<BlockRecord | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Top Controls Header */}
      <div className="h-14 border-b border-zinc-200 px-6 bg-zinc-50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 flex items-center space-x-2">
            <Database className="w-4 h-4 text-zinc-900" />
            <span>Sliding-Window Finality Buffer</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Portaldot Network V3.0 Hybrid Finality (Substrate GRANDPA + EVM state execution)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {reorgActive ? (
            <button
              onClick={resetReorg}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Canonical Chain</span>
            </button>
          ) : (
            <button
              onClick={triggerReorg}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate 2-Block Reorg</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 border-b border-zinc-200 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white text-xs shrink-0">
        <div className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-zinc-100 rounded text-zinc-900">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Head Block</div>
            <div className="text-sm font-bold text-zinc-900 font-mono">
              #{currentBlockHeight.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Finalized Block (GRANDPA)</div>
            <div className="text-sm font-bold text-zinc-900 font-mono">
              #{(currentBlockHeight - finalizedLag).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-amber-50 text-amber-700 rounded">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Buffered Lag</div>
            <div className="text-sm font-bold text-zinc-900 font-mono">
              {finalizedLag} Blocks (Probabilistic)
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center space-x-3">
          <div
            className={`p-2 rounded ${
              reorgActive ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Reorg Status</div>
            <div className="text-sm font-bold text-zinc-900">
              {reorgActive ? 'Reorg Reconciled' : 'Canonical Branch Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
        {/* Reorg Alert Message */}
        {reorgAlert && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start space-x-2.5 shrink-0 shadow-sm animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Reorg Reconciled: </span>
              <span>{reorgAlert}</span>
            </div>
          </div>
        )}

        {/* Explain Card */}
        <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-600 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Peridex shields client applications from Substrate consensus reorganization. Blocks in the top sliding window are marked <span className="font-semibold text-amber-800">Buffered</span> until verified by Portaldot GRANDPA finality. If a block hash mismatch occurs, Peridex rolls back the unfinalized events and re-indexes the canonical branch automatically.
          </p>
        </div>

        {/* Live Block Stream Table */}
        <div className="border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Height</th>
                <th className="py-2.5 px-4">Block Hash</th>
                <th className="py-2.5 px-4">Parent Hash</th>
                <th className="py-2.5 px-4">VM Execution</th>
                <th className="py-2.5 px-4">Decoded Events</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4 text-right">Finality State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {blockStream.map((block) => {
                const isOrphaned = block.status === 'Orphaned';
                const isBuffered = block.status === 'Buffered';

                return (
                  <tr
                    key={`${block.number}_${block.hash}`}
                    onClick={() => setSelectedBlock(block)}
                    className={`cursor-pointer transition ${
                      isOrphaned
                        ? 'bg-red-50/60 line-through text-zinc-400'
                        : isBuffered
                        ? 'bg-amber-50/30 text-zinc-900 hover:bg-amber-50/50'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold">
                      #{block.number.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div className="flex items-center space-x-1">
                        <span>{block.hash.slice(0, 10)}...{block.hash.slice(-6)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(block.hash, `block_${block.number}`);
                          }}
                          className="text-zinc-400 hover:text-zinc-900"
                        >
                          {copiedLabel === `block_${block.number}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {block.parentHash.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
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
                    <td className="py-3 px-4 font-sans text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-zinc-700">
                          {block.eventsCount} events
                        </span>
                        <span className="text-zinc-400 text-[11px] truncate max-w-[220px]">
                          ({block.eventsSummary.join(', ')})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-[11px]">
                      {block.timestamp}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
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

        {/* Selected Block Details Modal / Panel */}
        {selectedBlock && (
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 font-mono">
                Block #{selectedBlock.number} Details
              </span>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-xs text-zinc-500 hover:text-zinc-900"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Hash: </span>
                <span className="text-zinc-900">{selectedBlock.hash}</span>
              </div>
              <div>
                <span className="text-zinc-500">Parent: </span>
                <span className="text-zinc-900">{selectedBlock.parentHash}</span>
              </div>
              <div>
                <span className="text-zinc-500">Execution: </span>
                <span className="text-zinc-900">{selectedBlock.vmExecution}</span>
              </div>
              <div>
                <span className="text-zinc-500">Status: </span>
                <span className="text-zinc-900">{selectedBlock.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
