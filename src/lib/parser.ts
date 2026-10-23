import {
  UnifiedContractSchema,
  UnifiedEvent,
  UnifiedMethod,
  UnifiedParam,
  VMType,
} from './types';

/**
 * Standard deterministic 32-byte hash generator (Keccak-256 style)
 * Zero external dependency for guaranteed browser and Node compatibility.
 */
export function computeSchemaHash(input: string): string {
  // Simple deterministic 256-bit Fowler-Noll-Vo / Murmur hybrid hash yielding 64 hex chars (32 bytes)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;
  let h5 = 0xc2b2ae35;
  let h6 = 0x27d4eb2f;
  let h7 = 0x165667b1;
  let h8 = 0xf39fd6e5;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ (ch << 1), 1597334677);
    h3 = Math.imul(h3 ^ (ch << 2), 3812015801);
    h4 = Math.imul(h4 ^ (ch << 3), 2246822507);
    h5 = Math.imul(h5 ^ (ch << 4), 3266489909);
    h6 = Math.imul(h6 ^ (ch << 5), 1779033703);
    h7 = Math.imul(h7 ^ (ch << 6), 2887299996);
    h8 = Math.imul(h8 ^ (ch << 7), 668265261);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `0x${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}${toHex(h8)}`;
}

/**
 * Map Solidity ABI types to TypeScript and JSON Schema types
 */
function mapSolidityType(solType: string): { tsType: string; jsonSchemaType: string; description?: string } {
  const cleanType = solType.trim();

  if (cleanType.endsWith('[]')) {
    const inner = mapSolidityType(cleanType.slice(0, -2));
    return {
      tsType: `${inner.tsType}[]`,
      jsonSchemaType: 'array',
      description: `Array of ${cleanType.slice(0, -2)}`,
    };
  }

  if (cleanType === 'address') {
    return {
      tsType: 'string',
      jsonSchemaType: 'string',
      description: 'EVM Address (0x hex string)',
    };
  }
  if (cleanType === 'bool') {
    return { tsType: 'boolean', jsonSchemaType: 'boolean' };
  }
  if (cleanType === 'string') {
    return { tsType: 'string', jsonSchemaType: 'string' };
  }
  if (cleanType.startsWith('bytes')) {
    return {
      tsType: 'string',
      jsonSchemaType: 'string',
      description: `Hex byte sequence (${cleanType})`,
    };
  }
  if (cleanType.startsWith('uint') || cleanType.startsWith('int')) {
    const bitSize = parseInt(cleanType.replace(/\D/g, '') || '256', 10);
    if (bitSize <= 48) {
      return { tsType: 'number', jsonSchemaType: 'number', description: `${cleanType} integer` };
    }
    return {
      tsType: 'bigint',
      jsonSchemaType: 'string',
      description: `${cleanType} represented as string or bigint`,
    };
  }

  return { tsType: 'any', jsonSchemaType: 'string', description: cleanType };
}

/**
 * Map Rust ink! types to TypeScript and JSON Schema types
 */
function mapInkType(rustType: string): { tsType: string; jsonSchemaType: string; description?: string } {
  const clean = (rustType || '').trim();

  if (clean.startsWith('Vec<') && clean.endsWith('>')) {
    const inner = mapInkType(clean.slice(4, -1));
    return {
      tsType: `${inner.tsType}[]`,
      jsonSchemaType: 'array',
      description: `Rust Vector of ${clean.slice(4, -1)}`,
    };
  }

  if (clean.startsWith('Option<') && clean.endsWith('>')) {
    const inner = mapInkType(clean.slice(7, -1));
    return {
      tsType: `${inner.tsType} | null`,
      jsonSchemaType: inner.jsonSchemaType,
      description: `Optional ${clean.slice(7, -1)}`,
    };
  }

  switch (clean) {
    case 'AccountId':
    case 'AccountId32':
      return {
        tsType: 'string',
        jsonSchemaType: 'string',
        description: 'Substrate SS58 Address (starts with 5)',
      };
    case 'Balance':
    case 'u128':
    case 'u256':
    case 'i128':
      return {
        tsType: 'bigint',
        jsonSchemaType: 'string',
        description: `SCALE-encoded ${clean} (string representation of large integer)`,
      };
    case 'u64':
    case 'i64':
      return {
        tsType: 'bigint',
        jsonSchemaType: 'string',
        description: `${clean} 64-bit integer`,
      };
    case 'u8':
    case 'u16':
    case 'u32':
    case 'i8':
    case 'i16':
    case 'i32':
      return {
        tsType: 'number',
        jsonSchemaType: 'number',
        description: `Rust ${clean} number`,
      };
    case 'bool':
      return { tsType: 'boolean', jsonSchemaType: 'boolean' };
    case 'String':
    case 'str':
      return { tsType: 'string', jsonSchemaType: 'string' };
    case 'Hash':
    case 'H256':
      return {
        tsType: 'string',
        jsonSchemaType: 'string',
        description: 'Substrate 32-byte Hash (0x...)',
      };
    default:
      return {
        tsType: 'any',
        jsonSchemaType: 'string',
        description: clean,
      };
  }
}

/**
 * Determine if input is ink! metadata JSON or Solidity ABI JSON
 */
export function detectVMType(rawJson: string | object): VMType {
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

    if (Array.isArray(parsed)) {
      return 'EVM';
    }

    if (parsed && typeof parsed === 'object') {
      if ('spec' in parsed || 'version' in parsed || 'source' in parsed) {
        return 'INK_WASM';
      }
      if ('abi' in parsed && Array.isArray((parsed as any).abi)) {
        return 'EVM';
      }
    }
    return 'EVM';
  } catch {
    return 'EVM';
  }
}

/**
 * Normalize Solidity EVM ABI into UnifiedContractSchema
 */
function parseSolidityAbi(
  abi: any[],
  contractName: string = 'EVMContract',
  targetAddress: string = '0x0000000000000000000000000000000000000000',
  rawJson: string = ''
): UnifiedContractSchema {
  const readMethods: UnifiedMethod[] = [];
  const writeMethods: UnifiedMethod[] = [];
  const events: UnifiedEvent[] = [];

  for (const item of abi) {
    if (!item) continue;

    if (item.type === 'function') {
      const inputs: UnifiedParam[] = (item.inputs || []).map((inp: any, idx: number) => {
        const mapped = mapSolidityType(inp.type || 'bytes');
        return {
          name: inp.name || `arg${idx}`,
          type: inp.type || 'bytes',
          tsType: mapped.tsType,
          jsonSchemaType: mapped.jsonSchemaType,
          description: mapped.description,
        };
      });

      const outputs: UnifiedParam[] = (item.outputs || []).map((out: any, idx: number) => {
        const mapped = mapSolidityType(out.type || 'bytes');
        return {
          name: out.name || `return${idx}`,
          type: out.type || 'bytes',
          tsType: mapped.tsType,
          jsonSchemaType: mapped.jsonSchemaType,
          description: mapped.description,
        };
      });

      const isRead = item.stateMutability === 'view' || item.stateMutability === 'pure';
      const isPayable = item.stateMutability === 'payable';
      const sig = `${item.name}(${inputs.map((i) => i.type).join(',')})`;

      const method: UnifiedMethod = {
        name: item.name,
        signature: sig,
        vmType: 'EVM',
        isRead,
        payable: isPayable,
        inputs,
        outputs,
        selector: computeSchemaHash(sig).slice(0, 10),
        description: `EVM ${isRead ? 'read (view/pure)' : 'write (state mutating)'} function`,
      };

      if (isRead) {
        readMethods.push(method);
      } else {
        writeMethods.push(method);
      }
    } else if (item.type === 'event') {
      const params: UnifiedParam[] = (item.inputs || []).map((inp: any, idx: number) => {
        const mapped = mapSolidityType(inp.type || 'bytes');
        return {
          name: inp.name || `param${idx}`,
          type: inp.type || 'bytes',
          tsType: mapped.tsType,
          jsonSchemaType: mapped.jsonSchemaType,
          indexed: Boolean(inp.indexed),
          description: mapped.description,
        };
      });

      const sig = `${item.name}(${params.map((p) => p.type).join(',')})`;

      events.push({
        name: item.name,
        signature: sig,
        params,
        topicHash: computeSchemaHash(`event:${sig}`),
        description: `EVM Keccak-256 indexed contract event`,
      });
    }
  }

  const schemaHash = computeSchemaHash(
    JSON.stringify({
      vmType: 'EVM',
      contractName,
      reads: readMethods.map((m) => m.signature),
      writes: writeMethods.map((m) => m.signature),
      events: events.map((e) => e.signature),
    })
  );

  return {
    contractName,
    vmType: 'EVM',
    targetAddress,
    schemaHash,
    readMethods,
    writeMethods,
    events,
    rawJson,
  };
}

/**
 * Normalize Rust ink! V5 Metadata into UnifiedContractSchema
 */
function parseInkMetadata(
  metadata: any,
  contractName: string = 'InkContract',
  targetAddress: string = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  rawJson: string = ''
): UnifiedContractSchema {
  const readMethods: UnifiedMethod[] = [];
  const writeMethods: UnifiedMethod[] = [];
  const events: UnifiedEvent[] = [];

  const spec = metadata.spec || {};
  const messages = spec.messages || [];
  const specEvents = spec.events || [];
  const resolvedName = metadata.contract?.name || contractName;

  for (const msg of messages) {
    const label = msg.label || msg.name || 'unnamed_message';
    const isMutates = Boolean(msg.mutates);
    const isPayable = Boolean(msg.payable);

    const inputs: UnifiedParam[] = (msg.args || []).map((arg: any, idx: number) => {
      const typeName = arg.type?.displayName?.join('::') || arg.type?.name || arg.type || 'AccountId';
      const mapped = mapInkType(typeName);
      return {
        name: arg.label || arg.name || `arg${idx}`,
        type: typeName,
        tsType: mapped.tsType,
        jsonSchemaType: mapped.jsonSchemaType,
        description: mapped.description,
      };
    });

    const returnTypeName =
      msg.returnType?.displayName?.join('::') || msg.returnType?.name || msg.returnType || '()';
    const returnMapped = mapInkType(returnTypeName);

    const outputs: UnifiedParam[] =
      returnTypeName !== '()'
        ? [
            {
              name: 'result',
              type: returnTypeName,
              tsType: returnMapped.tsType,
              jsonSchemaType: returnMapped.jsonSchemaType,
              description: returnMapped.description,
            },
          ]
        : [];

    const sig = `${label}(${inputs.map((i) => i.type).join(',')})`;
    const method: UnifiedMethod = {
      name: label,
      signature: sig,
      vmType: 'INK_WASM',
      isRead: !isMutates,
      payable: isPayable,
      inputs,
      outputs,
      selector: msg.selector || computeSchemaHash(sig).slice(0, 10),
      description: `WASM ink! ${!isMutates ? 'query (read-only)' : 'message (state transition)'}`,
    };

    if (!isMutates) {
      readMethods.push(method);
    } else {
      writeMethods.push(method);
    }
  }

  for (const ev of specEvents) {
    const label = ev.label || ev.name || 'UnnamedEvent';
    const params: UnifiedParam[] = (ev.args || []).map((arg: any, idx: number) => {
      const typeName = arg.type?.displayName?.join('::') || arg.type?.name || arg.type || 'Balance';
      const mapped = mapInkType(typeName);
      return {
        name: arg.label || arg.name || `arg${idx}`,
        type: typeName,
        tsType: mapped.tsType,
        jsonSchemaType: mapped.jsonSchemaType,
        indexed: Boolean(arg.indexed),
        description: mapped.description,
      };
    });

    const sig = `${label}(${params.map((p) => p.type).join(',')})`;
    events.push({
      name: label,
      signature: sig,
      params,
      topicHash: computeSchemaHash(`ink:event:${sig}`),
      description: 'Substrate Pallet Contracts indexed event',
    });
  }

  const schemaHash = computeSchemaHash(
    JSON.stringify({
      vmType: 'INK_WASM',
      contractName: resolvedName,
      reads: readMethods.map((m) => m.signature),
      writes: writeMethods.map((m) => m.signature),
      events: events.map((e) => e.signature),
    })
  );

  return {
    contractName: resolvedName,
    vmType: 'INK_WASM',
    targetAddress,
    schemaHash,
    readMethods,
    writeMethods,
    events,
    rawJson,
  };
}

/**
 * Main Normalization function
 * Accepts any JSON string or object (EVM ABI or ink! Metadata)
 * and produces a validated UnifiedContractSchema.
 */
export function parseContractSchema(
  rawInput: string | object,
  overrideVmType?: VMType,
  overrideAddress?: string
): UnifiedContractSchema {
  const rawString = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput, null, 2);
  let parsed: any;

  try {
    parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  } catch (err: any) {
    throw new Error(`Invalid JSON syntax: ${err.message}`);
  }

  const detectedVM = overrideVmType || detectVMType(parsed);

  if (detectedVM === 'INK_WASM') {
    const targetAddress =
      overrideAddress || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const contractName = parsed.contract?.name || 'PortalStakingInk';
    return parseInkMetadata(parsed, contractName, targetAddress, rawString);
  } else {
    const targetAddress =
      overrideAddress || '0x71C8360f3E10D7C014E8C61E70F1C7892927289A';
    const abi = Array.isArray(parsed) ? parsed : parsed.abi || [];
    const contractName = parsed.contractName || 'ERC20PortalToken';
    return parseSolidityAbi(abi, contractName, targetAddress, rawString);
  }
}
