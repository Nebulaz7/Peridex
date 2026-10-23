import { UnifiedContractSchema, McpServerConfig, McpTool } from './types';

export function generateMcpServerConfig(schema: UnifiedContractSchema): McpServerConfig {
  const tools: McpTool[] = [];

  // 1. Read Tools
  schema.readMethods.forEach((method) => {
    const properties: Record<string, { type: string; description?: string }> = {};
    const required: string[] = [];

    method.inputs.forEach((inp) => {
      properties[inp.name] = {
        type: inp.jsonSchemaType,
        description: inp.description || `${inp.type} argument for ${method.name}`,
      };
      required.push(inp.name);
    });

    tools.push({
      name: `portaldot_read_${method.name}`,
      description: `[${schema.vmType} Read] ${method.signature}. Query Portaldot V3.0 state without gas costs. Returns decoded result.`,
      inputSchema: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    });
  });

  // 2. Write / Tx Builder Tools
  schema.writeMethods.forEach((method) => {
    const properties: Record<string, { type: string; description?: string }> = {};
    const required: string[] = [];

    method.inputs.forEach((inp) => {
      properties[inp.name] = {
        type: inp.jsonSchemaType,
        description: inp.description || `${inp.type} argument for ${method.name}`,
      };
      required.push(inp.name);
    });

    if (method.payable) {
      properties['value'] = {
        type: 'string',
        description: 'Native POT value to attach with transaction (in Wei / Planck)',
      };
    }

    tools.push({
      name: `portaldot_build_tx_${method.name}`,
      description: `[${schema.vmType} Write] ${method.signature}. Constructs an unsigned ${schema.vmType === 'EVM' ? 'calldata' : 'SCALE-encoded'} transaction payload ready for wallet signing.`,
      inputSchema: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    });
  });

  // 3. Event Query Tools
  schema.events.forEach((ev) => {
    const properties: Record<string, { type: string; description?: string }> = {
      limit: {
        type: 'number',
        description: 'Maximum number of historic events to retrieve (default: 20)',
      },
      fromBlock: {
        type: 'number',
        description: 'Starting block height to search from',
      },
      finalizedOnly: {
        type: 'boolean',
        description: 'If true, excludes buffered unconfirmed blocks to prevent reorg discrepancies',
      },
    };

    // Filter properties from indexed event parameters
    ev.params
      .filter((p) => p.indexed)
      .forEach((p) => {
        properties[`filter_${p.name}`] = {
          type: p.jsonSchemaType,
          description: `Filter by indexed topic: ${p.description || p.type}`,
        };
      });

    tools.push({
      name: `portaldot_query_events_${ev.name}`,
      description: `[${schema.vmType} Event Stream] Query indexed historic '${ev.name}' event logs for contract ${schema.targetAddress} with finality confirmation filters.`,
      inputSchema: {
        type: 'object',
        properties,
      },
    });
  });

  return {
    name: `peridex-portaldot-${schema.contractName.toLowerCase()}`,
    version: '1.0.0',
    network: 'portaldot-v3-testnet',
    contractAddress: schema.targetAddress,
    tools,
  };
}

export function formatMcpJson(schema: UnifiedContractSchema): string {
  const config = generateMcpServerConfig(schema);
  const fullSpec = {
    $schema: 'https://modelcontextprotocol.io/schema/draft/2024-11-05/server.json',
    serverInfo: {
      name: config.name,
      version: config.version,
      description: `Auto-generated Model Context Protocol (MCP) server for ${schema.contractName} on Portaldot Network V3.0`,
    },
    network: {
      id: 'portaldot-v3-testnet',
      evmChainId: 420420777,
      rpc: 'https://test-evm-rpc-v3.portaldot.dev',
      ws: 'wss://test-node-v3.portaldot.dev',
    },
    contract: {
      name: schema.contractName,
      address: schema.targetAddress,
      vmType: schema.vmType,
      schemaHash: schema.schemaHash,
    },
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
    tools: config.tools,
  };

  return JSON.stringify(fullSpec, null, 2);
}
