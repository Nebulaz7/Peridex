import {
  BlockRecord,
  UnifiedContractSchema,
  UnifiedMethod,
  UnifiedEvent,
  McpExecutionTrace,
  ApiExecutionResult,
} from './types';

export function createInitialBlocks(baseHeight: number = 1482910): BlockRecord[] {
  const blocks: BlockRecord[] = [];

  for (let i = 0; i < 12; i++) {
    const height = baseHeight - i;
    const isBuffered = i < 2; // Top 2 blocks in sliding window are buffered

    const hashSeed = height * 7919;
    const parentHashSeed = (height - 1) * 7919;

    const toHex32 = (seed: number) =>
      '0x' +
      seed.toString(16).padStart(8, '0') +
      'a9f83e201b874c61928' +
      (seed % 9999).toString(16).padStart(4, '0') +
      'e1b4c7';

    const vmTypes: Array<'EVM' | 'WASM' | 'Dual-VM'> = ['Dual-VM', 'EVM', 'WASM', 'Dual-VM'];
    const vmExecution = vmTypes[height % vmTypes.length];

    const sampleEvents =
      vmExecution === 'EVM'
        ? ['Transfer(0x71C...89A -> 0x902...11E, 500 POT)', 'Approval(0x71C...89A, 1000 POT)']
        : vmExecution === 'WASM'
        ? ['Staked(5Grw...utQY, 5000 PLANCK)', 'RewardsClaimed(5Grw...utQY)']
        : [
            'Transfer(0x111... -> 0x222..., 250 POT)',
            'Staked(5FHn...kRz, 12000 PLANCK)',
            'SchemaRegistered(0x40e...16b)',
          ];

    blocks.push({
      number: height,
      hash: toHex32(hashSeed),
      parentHash: toHex32(parentHashSeed),
      vmExecution,
      eventsCount: sampleEvents.length,
      eventsSummary: sampleEvents,
      status: isBuffered ? 'Buffered' : 'Finalized',
      timestamp: new Date(Date.now() - i * 6000).toISOString().split('T')[1].slice(0, 8) + ' UTC',
    });
  }

  return blocks;
}

export function executeReorgSimulation(currentBlocks: BlockRecord[]): {
  updatedBlocks: BlockRecord[];
  rolledBackBlocks: BlockRecord[];
  canonicalBranchBlocks: BlockRecord[];
  logMessage: string;
} {
  const buffered = currentBlocks.filter((b) => b.status === 'Buffered');
  const finalized = currentBlocks.filter((b) => b.status === 'Finalized');

  // Mark buffered blocks as orphaned / rolled back
  const rolledBackBlocks = buffered.map((b) => ({
    ...b,
    status: 'Orphaned' as const,
  }));

  // Create new canonical blocks to replace them with different block hashes (the reorged chain)
  const canonicalBranchBlocks: BlockRecord[] = buffered.map((b, idx) => {
    const reorgSeed = b.number * 9973 + 42;
    const newHash =
      '0x' +
      reorgSeed.toString(16).padStart(8, '0') +
      'ff00aa3322114455887' +
      (reorgSeed % 7777).toString(16).padStart(4, '0') +
      'c0ffee';

    return {
      ...b,
      hash: newHash,
      status: 'Finalized' as const,
      eventsSummary: ['Reconciled canonical state: validator set rotation', 'Transfer(0xcanonical...100 POT)'],
      eventsCount: 2,
    };
  });

  const updatedBlocks = [...canonicalBranchBlocks, ...finalized.slice(0, 10)];

  return {
    updatedBlocks,
    rolledBackBlocks,
    canonicalBranchBlocks,
    logMessage: `Portaldot GRANDPA Finality Alert: Reorg of 2 blocks detected at heights #${buffered.map((b) => b.number).join(', #')}. Unconfirmed events purged; canonical branch synchronized.`,
  };
}

export function simulateApiCall(
  schema: UnifiedContractSchema,
  endpointType: 'read' | 'write' | 'event',
  name: string,
  args: Record<string, any>
): ApiExecutionResult {
  const latency = Math.floor(Math.random() * 8) + 11; // 11ms - 18ms
  const currentBlock = 1482910;
  const isEVM = schema.vmType === 'EVM';

  if (endpointType === 'read') {
    let mockResult: any = '0x01';
    if (name.includes('balance') || name.includes('Balance')) {
      mockResult = isEVM ? '1450000000000000000000' : '25000000000000'; // 1450 POT or 25000 Planck
    } else if (name === 'totalSupply' || name === 'get_total_staked') {
      mockResult = isEVM ? '100000000000000000000000000' : '500000000000000';
    } else if (name === 'name') {
      mockResult = 'Portaldot V3 Ecosystem Token';
    } else if (name === 'symbol') {
      mockResult = 'POT';
    } else if (name === 'decimals') {
      mockResult = 18;
    } else if (name === 'get_validator_set') {
      mockResult = [
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      ];
    } else if (name === 'isFinalized') {
      mockResult = true;
    } else if (name === 'getDeploymentCount') {
      mockResult = '3';
    } else {
      mockResult = { status: 'success', value: '100' };
    }

    const payload = {
      success: true,
      data: {
        method: name,
        vmType: schema.vmType,
        targetContract: schema.targetAddress,
        blockNumber: currentBlock,
        stateRoot: '0x4728109384729f83a48e918239a039840291e0892019b8c382109e84739281a0',
        inputs: args,
        result: mockResult,
        latencyMs: latency,
      },
    };

    return {
      endpoint: `/v1/portaldot/${schema.targetAddress}/read/${name}`,
      method: 'GET',
      status: 200,
      latencyMs: latency,
      payload,
      curlCommand: `curl -X GET "https://api.peridex.io/v1/portaldot/${schema.targetAddress}/read/${name}" \\
  -H "Accept: application/json" \\
  -H "x-peridex-key: pdx_live_sec_8921"`,
    };
  } else if (endpointType === 'write') {
    const selector = isEVM ? '0xa9059cbb' : '0x29ef991c';
    const calldata = isEVM
      ? `${selector}000000000000000000000000${(args.recipient || '0x71C8360f3E10D7C014E8C61E70F1C7892927289A').replace('0x', '')}0000000000000000000000000000000000000000000000000de0b6b3a7640000`
      : `${selector}0100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000064a7b3b6e00d`;

    const payload = {
      success: true,
      transactionPayload: {
        to: schema.targetAddress,
        vmType: schema.vmType,
        method: name,
        selector,
        calldata,
        estimatedGas: isEVM ? '48,250' : '1,280,000 Weight',
        unsigned: true,
        chain: 'Portaldot V3.0 (EVM ID 420420777)',
      },
    };

    return {
      endpoint: `/v1/portaldot/${schema.targetAddress}/tx/${name}`,
      method: 'POST',
      status: 200,
      latencyMs: latency,
      payload,
      curlCommand: `curl -X POST "https://api.peridex.io/v1/portaldot/${schema.targetAddress}/tx/${name}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(args)}'`,
    };
  } else {
    // Event endpoint
    const payload = {
      success: true,
      data: {
        event: name,
        contract: schema.targetAddress,
        totalMatches: 2,
        records: [
          {
            blockNumber: currentBlock - 2,
            transactionHash: '0x9a8f1029c8e7182930a471b82947192837192837192837192837192837192837',
            logIndex: 0,
            finalized: true,
            topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
            decoded: {
              from: '0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
              to: '0x902100000000000000000000000000000000011E',
              value: '500000000000000000000',
            },
          },
          {
            blockNumber: currentBlock - 5,
            transactionHash: '0x4e7b892109847129847129837192837192837192837192837192837192837192',
            logIndex: 1,
            finalized: true,
            topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
            decoded: {
              from: '0x0000000000000000000000000000000000000000',
              to: '0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
              value: '1000000000000000000000',
            },
          },
        ],
      },
    };

    return {
      endpoint: `/v1/portaldot/${schema.targetAddress}/events/${name}?limit=20&finalized=true`,
      method: 'GET',
      status: 200,
      latencyMs: latency,
      payload,
      curlCommand: `curl -X GET "https://api.peridex.io/v1/portaldot/${schema.targetAddress}/events/${name}?limit=20&finalized=true"`,
    };
  }
}

export function generateContractPrompts(schema: UnifiedContractSchema): string[] {
  if (schema.contractName === 'PortalStakingInk' || schema.vmType === 'INK_WASM') {
    return [
      'Query total staked balance and active validator set',
      'Check staked balance for 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      'Build bond_stake transaction payload for validator Alice with 5000 Planck',
      'Query recent Staked events from finalized blocks',
    ];
  } else if (schema.contractName === 'PeridexRegistry') {
    return [
      'Verify schema registration for ERC20PortalToken on PeridexRegistry',
      'Check if block #1482908 is anchored as finalized',
      'Get total deployment count of dual-VM schemas',
      'Construct anchorFinalityCheckpoint transaction payload',
    ];
  } else {
    // Default ERC20
    return [
      'Query totalSupply and token metadata (name, symbol, decimals)',
      'Check balanceOf 0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
      'Build unsigned transfer payload of 500 POT to 0x9021...011E',
      'Query recent Transfer events filtered by finalized blocks',
    ];
  }
}

export function executeMcpPrompt(
  prompt: string,
  schema: UnifiedContractSchema
): McpExecutionTrace {
  const currentBlock = 1482910;
  const isEVM = schema.vmType === 'EVM';
  const txHash = '0x8b39e0192847c9281a039840291e0892019b8c382109e84739281a0392810938';

  let toolName = 'portaldot_read_balanceOf';
  let inputArgs: Record<string, any> = {};
  let rpcResult: Record<string, any> = {};
  let agentSynthesis = '';

  const lower = prompt.toLowerCase();

  if (lower.includes('validator') || lower.includes('staked balance') || lower.includes('total staked')) {
    toolName = 'portaldot_read_get_staked_balance';
    inputArgs = { staker: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
    rpcResult = {
      staker: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      staked_balance: '25,000,000,000,000 PLANCK',
      active_validators_count: 3,
      blockNumber: currentBlock,
      confirmedFinality: true,
    };
    agentSynthesis = `The queried staker (Alice) currently holds a verified staked balance of 25,000,000,000,000 PLANCK on Portaldot V3.0 (Block #${currentBlock}, finalized). There are 3 active validators in the consensus pool.`;
  } else if (lower.includes('totalsupply') || lower.includes('metadata')) {
    toolName = 'portaldot_read_totalSupply';
    inputArgs = {};
    rpcResult = {
      token: 'Portaldot V3 Ecosystem Token (POT)',
      symbol: 'POT',
      decimals: 18,
      totalSupply: '100,000,000 POT (100,000,000,000,000,000,000,000,000 wei)',
      blockNumber: currentBlock,
    };
    agentSynthesis = `Token metadata: "Portaldot V3 Ecosystem Token" ($POT) has 18 decimals and a total circulating supply of 100,000,000 POT indexed at block #${currentBlock}.`;
  } else if (lower.includes('transfer') || lower.includes('bond_stake') || lower.includes('payload')) {
    toolName = isEVM ? 'portaldot_build_tx_transfer' : 'portaldot_build_tx_bond_stake';
    inputArgs = isEVM
      ? { recipient: '0x902100000000000000000000000000000000011E', amount: '500000000000000000000' }
      : { validator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '5000000000000' };

    rpcResult = {
      vmType: schema.vmType,
      to: schema.targetAddress,
      calldata: isEVM
        ? '0xa9059cbb000000000000000000000000902100000000000000000000000000000000011e00000000000000000000000000000000000000000000001b1ae4d6e2ef500000'
        : '0x29ef991c0100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000000e876481700',
      estimatedGas: isEVM ? '48,250' : '1,250,000 Weight units',
      unsigned: true,
      readyToSign: true,
    };
    agentSynthesis = `Constructed unsigned ${schema.vmType} transaction payload for ${schema.targetAddress}. Calldata encoded with ${isEVM ? 'Keccak-256 ABI' : 'Substrate SCALE format'} ready for user wallet broadcast. Estimated execution gas: ${rpcResult.estimatedGas}.`;
  } else if (lower.includes('registry') || lower.includes('finalized') || lower.includes('checkpoint')) {
    toolName = 'portaldot_read_isFinalized';
    inputArgs = { blockNumber: 1482908 };
    rpcResult = {
      blockNumber: 1482908,
      finalized: true,
      blockHash: '0x9f83a48e918239a039840291e0892019b8c382109e84739281a0392810938472',
      anchoredOnChain: true,
    };
    agentSynthesis = `Block #1482908 is confirmed and anchored on PeridexRegistry.sol with canonical state root 0x4728...81a0. Transactions within this block are immune to reorg rollback.`;
  } else {
    // Default fallback
    toolName = schema.readMethods[0] ? `portaldot_read_${schema.readMethods[0].name}` : 'portaldot_read_query';
    inputArgs = { target: schema.targetAddress };
    rpcResult = {
      status: 'success',
      data: 'State verified on Portaldot V3.0',
      blockNumber: currentBlock,
    };
    agentSynthesis = `Successfully executed ${toolName} on ${schema.targetAddress}. State retrieved in 14ms from Portaldot V3.0 indexed cache at block #${currentBlock}.`;
  }

  return {
    id: `trace_${Date.now()}`,
    prompt,
    toolName,
    inputArgs,
    rpcResult,
    agentSynthesis,
    latencyMs: 14,
    blockNumber: currentBlock,
    txHash,
  };
}

export function generateGraphQLSchema(schema: UnifiedContractSchema): string {
  const { contractName, readMethods, writeMethods, events, vmType } = schema;

  const lines: string[] = [];
  lines.push(`"""`);
  lines.push(`Peridex Dual-VM GraphQL Schema for ${contractName} (${vmType})`);
  lines.push(`Auto-generated from normalized contract schema`);
  lines.push(`"""`);
  lines.push(``);
  lines.push(`type Query {`);
  readMethods.forEach((method) => {
    const argsStr = method.inputs.map((i) => `${i.name}: ${i.jsonSchemaType === 'number' ? 'Int' : i.jsonSchemaType === 'boolean' ? 'Boolean' : 'String'}`).join(', ');
    lines.push(`  ${method.name}(${argsStr}): ${method.name}Response!`);
  });
  lines.push(`  getLatestFinalizedBlock: BlockHeader!`);
  lines.push(`}`);
  lines.push(``);

  lines.push(`type Mutation {`);
  writeMethods.forEach((method) => {
    const argsStr = method.inputs.map((i) => `${i.name}: ${i.jsonSchemaType === 'number' ? 'Int' : i.jsonSchemaType === 'boolean' ? 'Boolean' : 'String'}`).join(', ');
    lines.push(`  build_${method.name}Tx(${argsStr}): UnsignedTxPayload!`);
  });
  lines.push(`}`);
  lines.push(``);

  lines.push(`type Subscription {`);
  events.forEach((ev) => {
    lines.push(`  on${ev.name}(finalizedOnly: Boolean = true): ${ev.name}Event!`);
  });
  lines.push(`  onBlockFinalized: BlockHeader!`);
  lines.push(`}`);
  lines.push(``);

  lines.push(`type BlockHeader {`);
  lines.push(`  number: Int!`);
  lines.push(`  hash: String!`);
  lines.push(`  stateRoot: String!`);
  lines.push(`  finalized: Boolean!`);
  lines.push(`}`);
  lines.push(``);

  lines.push(`type UnsignedTxPayload {`);
  lines.push(`  to: String!`);
  lines.push(`  calldata: String!`);
  lines.push(`  vmType: String!`);
  lines.push(`  estimatedGas: String!`);
  lines.push(`}`);
  lines.push(``);

  readMethods.forEach((method) => {
    lines.push(`type ${method.name}Response {`);
    lines.push(`  blockNumber: Int!`);
    lines.push(`  value: String!`);
    lines.push(`  latencyMs: Int!`);
    lines.push(`}`);
    lines.push(``);
  });

  events.forEach((ev) => {
    lines.push(`type ${ev.name}Event {`);
    lines.push(`  blockNumber: Int!`);
    lines.push(`  txHash: String!`);
    lines.push(`  finalized: Boolean!`);
    ev.params.forEach((p) => {
      lines.push(`  ${p.name}: String!`);
    });
    lines.push(`}`);
    lines.push(``);
  });

  return lines.join('\n');
}
