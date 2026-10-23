export type VMType = 'EVM' | 'INK_WASM';

export interface UnifiedParam {
  name: string;
  type: string;
  tsType: string;
  jsonSchemaType: string;
  indexed?: boolean;
  description?: string;
}

export interface UnifiedMethod {
  name: string;
  signature: string;
  vmType: VMType;
  isRead: boolean;
  payable: boolean;
  inputs: UnifiedParam[];
  outputs: UnifiedParam[];
  selector?: string;
  description?: string;
}

export interface UnifiedEvent {
  name: string;
  signature: string;
  params: UnifiedParam[];
  topicHash?: string;
  description?: string;
}

export interface UnifiedContractSchema {
  contractName: string;
  vmType: VMType;
  targetAddress: string;
  schemaHash: string;
  readMethods: UnifiedMethod[];
  writeMethods: UnifiedMethod[];
  events: UnifiedEvent[];
  rawJson: string;
}

export type FinalityStatus = 'Finalized' | 'Buffered' | 'Orphaned';

export interface BlockRecord {
  number: number;
  hash: string;
  parentHash: string;
  vmExecution: 'EVM' | 'WASM' | 'Dual-VM';
  eventsCount: number;
  eventsSummary: string[];
  status: FinalityStatus;
  timestamp: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface McpServerConfig {
  name: string;
  version: string;
  network: string;
  contractAddress: string;
  tools: McpTool[];
}

export interface McpExecutionTrace {
  id: string;
  prompt: string;
  toolName: string;
  inputArgs: Record<string, any>;
  rpcResult: Record<string, any>;
  agentSynthesis: string;
  latencyMs: number;
  blockNumber: number;
  txHash: string;
}

export interface ApiExecutionResult {
  endpoint: string;
  method: 'GET' | 'POST';
  status: number;
  latencyMs: number;
  payload: Record<string, any>;
  curlCommand: string;
}
