'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  VMType,
  UnifiedContractSchema,
  BlockRecord,
  McpExecutionTrace,
} from '@/lib/types';
import { parseContractSchema } from '@/lib/parser';
import {
  ALL_PRESETS,
  PRESET_ERC20,
  PRESET_STAKING_INK,
  PRESET_REGISTRY,
  PresetContract,
} from '@/lib/presets';
import {
  createInitialBlocks,
  executeReorgSimulation,
  executeMcpPrompt,
  generateContractPrompts,
} from '@/lib/simulator';

interface PeridexContextType {
  selectedPresetId: string;
  vmType: VMType;
  contractAddress: string;
  rawJsonInput: string;
  jsonError: string | null;
  normalizedSchema: UnifiedContractSchema;
  isCompiling: boolean;
  compiledSuccess: boolean;
  currentBlockHeight: number;
  finalizedLag: number;
  rpcMode: 'testnet' | 'anvil';
  blockStream: BlockRecord[];
  reorgActive: boolean;
  reorgAlert: string | null;
  mcpTraces: McpExecutionTrace[];
  isAgentRunning: boolean;
  dynamicPrompts: string[];
  loadPreset: (preset: PresetContract) => void;
  setVmType: (vm: VMType) => void;
  setContractAddress: (addr: string) => void;
  setRawJsonInput: (json: string) => void;
  compileAndIndex: () => boolean;
  setRpcMode: (mode: 'testnet' | 'anvil') => void;
  triggerReorg: () => void;
  resetReorg: () => void;
  runMcpPrompt: (prompt: string) => void;
  copiedLabel: string | null;
  copyToClipboard: (text: string, label: string) => void;
}

const PeridexContext = createContext<PeridexContextType | undefined>(undefined);

export function PeridexProvider({ children }: { children: ReactNode }) {
  // Global Network State
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(1482910);
  const [finalizedLag] = useState<number>(2);
  const [rpcMode, setRpcMode] = useState<'testnet' | 'anvil'>('testnet');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Active Schema & Ingestion State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('erc20');
  const [vmType, setVmType] = useState<VMType>('EVM');
  const [contractAddress, setContractAddress] = useState<string>(PRESET_ERC20.address);
  const [rawJsonInput, setRawJsonInput] = useState<string>(PRESET_ERC20.jsonContent);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compiledSuccess, setCompiledSuccess] = useState<boolean>(false);

  // Reorg Buffer State
  const [blockStream, setBlockStream] = useState<BlockRecord[]>(() => createInitialBlocks(1482910));
  const [reorgActive, setReorgActive] = useState<boolean>(false);
  const [reorgAlert, setReorgAlert] = useState<string | null>(null);

  // MCP Traces State
  const [mcpTraces, setMcpTraces] = useState<McpExecutionTrace[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  // Block Ticker
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
          return shifted.map((b, i) => (i >= 2 ? { ...b, status: 'Finalized' as const } : b));
        });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [reorgActive]);

  // Derived Normalized Schema
  const normalizedSchema: UnifiedContractSchema = useMemo(() => {
    try {
      setJsonError(null);
      return parseContractSchema(rawJsonInput, vmType, contractAddress);
    } catch (err: any) {
      setJsonError(err.message || 'JSON parse error');
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

  // Dynamic Prompts for MCP
  const dynamicPrompts = useMemo(() => {
    return generateContractPrompts(normalizedSchema);
  }, [normalizedSchema.contractName, normalizedSchema.vmType]);

  // Handlers
  const loadPreset = (preset: PresetContract) => {
    setSelectedPresetId(preset.id);
    setVmType(preset.vmType);
    setContractAddress(preset.address);
    setRawJsonInput(preset.jsonContent);
    setCompiledSuccess(true);
    setTimeout(() => setCompiledSuccess(false), 2000);
  };

  const compileAndIndex = (): boolean => {
    setIsCompiling(true);
    try {
      parseContractSchema(rawJsonInput, vmType, contractAddress);
      setIsCompiling(false);
      setCompiledSuccess(true);
      setTimeout(() => setCompiledSuccess(false), 2500);
      return true;
    } catch (err: any) {
      setIsCompiling(false);
      setJsonError(err.message);
      return false;
    }
  };

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

  const runMcpPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAgentRunning(true);
    setTimeout(() => {
      const trace = executeMcpPrompt(promptText, normalizedSchema);
      setMcpTraces((prev) => [trace, ...prev.slice(0, 9)]);
      setIsAgentRunning(false);
    }, 280);
  };

  return (
    <PeridexContext.Provider
      value={{
        selectedPresetId,
        vmType,
        contractAddress,
        rawJsonInput,
        jsonError,
        normalizedSchema,
        isCompiling,
        compiledSuccess,
        currentBlockHeight,
        finalizedLag,
        rpcMode,
        blockStream,
        reorgActive,
        reorgAlert,
        mcpTraces,
        isAgentRunning,
        dynamicPrompts,
        loadPreset,
        setVmType,
        setContractAddress,
        setRawJsonInput,
        compileAndIndex,
        setRpcMode,
        triggerReorg,
        resetReorg,
        runMcpPrompt,
        copiedLabel,
        copyToClipboard,
      }}
    >
      {children}
    </PeridexContext.Provider>
  );
}

export function usePeridex() {
  const context = useContext(PeridexContext);
  if (!context) {
    throw new Error('usePeridex must be used within a PeridexProvider');
  }
  return context;
}
