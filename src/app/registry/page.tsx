'use client';

import React from 'react';
import {
  Anchor,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import { usePeridex } from '@/context/PeridexContext';

export default function RegistryPage() {
  const { copyToClipboard, copiedLabel } = usePeridex();

  const registryContractAddress = '0x4204207770000000000000000000000000000001';

  const registeredDeployments = [
    {
      deploymentId: '0x40e3d1a12d75b936c0c79131a231be0baa3329eadf044627649b01a5fd79c16b',
      name: 'ERC20PortalToken',
      targetContract: '0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
      vmType: 'EVM' as const,
      schemaHash: '0x3a9f190283e18a90283c91209384729109382109482910384729102938471928',
      apiEndpoint: 'https://api.peridex.io/v1/portaldot/0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
      indexedAtBlock: 1482890,
      active: true,
    },
    {
      deploymentId: '0xdfa2ca9a6eaabf1b53dbc925e89d0f5dfd068ef68936df619ed9c0f8174a6ef9',
      name: 'PortalStakingInk',
      targetContract: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      vmType: 'INK_WASM' as const,
      schemaHash: '0x8b39201948271029384719284719283749281093847291029384719283749102',
      apiEndpoint: 'https://api.peridex.io/v1/portaldot/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      indexedAtBlock: 1482895,
      active: true,
    },
    {
      deploymentId: '0x1928374910293847192837491029384719283749102938471928374910293847',
      name: 'PeridexRegistry',
      targetContract: '0x4204207770000000000000000000000000000001',
      vmType: 'EVM' as const,
      schemaHash: '0x1029384710293847102938471029384710293847102938471029384710293847',
      apiEndpoint: 'https://api.peridex.io/v1/portaldot/0x4204207770000000000000000000000000000001',
      indexedAtBlock: 1482880,
      active: true,
    },
  ];

  const checkpoints = [
    {
      blockNumber: 1482908,
      blockHash: '0x9f83a48e918239a039840291e0892019b8c382109e84739281a0392810938472',
      stateRoot: '0x4728109384729f83a48e918239a039840291e0892019b8c382109e84739281a0',
      timestamp: '14 mins ago',
    },
    {
      blockNumber: 1482800,
      blockHash: '0x8a72b39102938471928374910293847192837491029384719283749102938471',
      stateRoot: '0x1928374910293847192837491029384719283749102938471928374910293847',
      timestamp: '1 hour ago',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white p-6 space-y-6">
      {/* Top Header Card */}
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Anchor className="w-5 h-5 text-zinc-950" />
            <h2 className="text-base font-bold text-zinc-950">PeridexRegistry.sol</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold">
              Live on Portaldot V3.0
            </span>
          </div>
          <div className="text-xs text-zinc-600 font-mono flex items-center space-x-2">
            <span className="text-zinc-400">Contract Address:</span>
            <span className="font-semibold text-zinc-900">{registryContractAddress}</span>
            <button
              onClick={() => copyToClipboard(registryContractAddress, 'regAddr')}
              className="text-zinc-400 hover:text-zinc-900"
            >
              {copiedLabel === 'regAddr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="https://node-console.portaldot.dev/"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>Node Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* On-Chain Registered Schemas Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Anchored Contract Schemas ({registeredDeployments.length})
          </h3>
          <span className="text-xs font-mono text-zinc-400">PeridexRegistry.registerSchema()</span>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Contract Name</th>
                <th className="py-2.5 px-4">Target Address</th>
                <th className="py-2.5 px-4">VM Type</th>
                <th className="py-2.5 px-4">Schema Hash (Keccak-256)</th>
                <th className="py-2.5 px-4">Indexed Height</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {registeredDeployments.map((dep) => (
                <tr key={dep.deploymentId} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-bold font-sans text-zinc-900">
                    {dep.name}
                  </td>
                  <td className="py-3 px-4 text-zinc-700">
                    {dep.targetContract.slice(0, 10)}...{dep.targetContract.slice(-6)}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                        dep.vmType === 'EVM'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dep.vmType === 'EVM' ? 'EVM Solidity' : 'WASM ink!'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600">
                    {dep.schemaHash.slice(0, 10)}...{dep.schemaHash.slice(-6)}
                  </td>
                  <td className="py-3 px-4 text-zinc-600">
                    #{dep.indexedAtBlock.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-medium border border-emerald-200 inline-flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Anchored</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finality Checkpoints Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            On-Chain Finality Checkpoints (GRANDPA State Roots)
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            PeridexRegistry.anchorFinalityCheckpoint()
          </span>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Block Height</th>
                <th className="py-2.5 px-4">Canonical Block Hash</th>
                <th className="py-2.5 px-4">State Root</th>
                <th className="py-2.5 px-4">Anchored</th>
                <th className="py-2.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {checkpoints.map((cp) => (
                <tr key={cp.blockNumber} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-bold text-zinc-900">
                    #{cp.blockNumber.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-zinc-600">
                    {cp.blockHash.slice(0, 12)}...{cp.blockHash.slice(-6)}
                  </td>
                  <td className="py-3 px-4 text-zinc-600">
                    {cp.stateRoot.slice(0, 12)}...{cp.stateRoot.slice(-6)}
                  </td>
                  <td className="py-3 px-4 font-sans text-zinc-500">
                    {cp.timestamp}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded text-[11px] font-medium border border-zinc-200 inline-flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-zinc-700" />
                      <span>GRANDPA Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
