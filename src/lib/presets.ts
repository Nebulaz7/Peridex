import { VMType } from './types';

export interface PresetContract {
  id: string;
  name: string;
  vmType: VMType;
  address: string;
  description: string;
  jsonContent: string;
}

export const PRESET_ERC20: PresetContract = {
  id: 'erc20',
  name: 'ERC20PortalToken',
  vmType: 'EVM',
  address: '0x71C8360f3E10D7C014E8C61E70F1C7892927289A',
  description: 'Portaldot V3.0 native EVM fungible token standard with balance, approval, and transfer events.',
  jsonContent: JSON.stringify(
    [
      {
        type: 'function',
        name: 'name',
        inputs: [],
        outputs: [{ name: '', type: 'string', internalType: 'string' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'symbol',
        inputs: [],
        outputs: [{ name: '', type: 'string', internalType: 'string' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'transferFrom',
        inputs: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'mint',
        inputs: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true, internalType: 'address' },
          { name: 'to', type: 'address', indexed: true, internalType: 'address' },
          { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
        ],
        anonymous: false,
      },
      {
        type: 'event',
        name: 'Approval',
        inputs: [
          { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
          { name: 'spender', type: 'address', indexed: true, internalType: 'address' },
          { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
        ],
        anonymous: false,
      },
    ],
    null,
    2
  ),
};

export const PRESET_STAKING_INK: PresetContract = {
  id: 'staking_ink',
  name: 'PortalStakingInk',
  vmType: 'INK_WASM',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  description: 'Substrate ink! V5 staking contract with validator sets, bonding pools, and slashing event streams.',
  jsonContent: JSON.stringify(
    {
      source: {
        hash: '0xb23e4981a8f3074d6c41b832a8b9487c9f801548a31e17d23a24147f2e1a3962',
        language: 'ink! 5.0.0',
        compiler: 'rustc 1.80.0',
      },
      contract: {
        name: 'PortalStakingInk',
        version: '1.0.0',
        authors: ['Portaldot Core Team <dev@portaldot.network>'],
      },
      spec: {
        constructors: [
          {
            args: [
              { label: 'minimum_stake', type: { displayName: ['Balance'] } },
              { label: 'unbonding_era_blocks', type: { displayName: ['u32'] } },
            ],
            label: 'new',
            payable: false,
            selector: '0x9bae9d5e',
          },
        ],
        messages: [
          {
            args: [{ label: 'staker', type: { displayName: ['AccountId'] } }],
            label: 'get_staked_balance',
            mutates: false,
            payable: false,
            returnType: { displayName: ['Balance'] },
            selector: '0x12a849f1',
          },
          {
            args: [],
            label: 'get_validator_set',
            mutates: false,
            payable: false,
            returnType: { displayName: ['Vec<AccountId>'] },
            selector: '0x49e0b127',
          },
          {
            args: [],
            label: 'get_total_staked',
            mutates: false,
            payable: false,
            returnType: { displayName: ['Balance'] },
            selector: '0x8b192ec8',
          },
          {
            args: [{ label: 'era', type: { displayName: ['u32'] } }],
            label: 'get_era_rewards',
            mutates: false,
            payable: false,
            returnType: { displayName: ['Balance'] },
            selector: '0x99fe2310',
          },
          {
            args: [
              { label: 'validator', type: { displayName: ['AccountId'] } },
              { label: 'amount', type: { displayName: ['Balance'] } },
            ],
            label: 'bond_stake',
            mutates: true,
            payable: true,
            returnType: { displayName: ['bool'] },
            selector: '0x29ef991c',
          },
          {
            args: [{ label: 'amount', type: { displayName: ['Balance'] } }],
            label: 'unbond_stake',
            mutates: true,
            payable: false,
            returnType: { displayName: ['bool'] },
            selector: '0x7b4012de',
          },
          {
            args: [{ label: 'validator', type: { displayName: ['AccountId'] } }],
            label: 'claim_rewards',
            mutates: true,
            payable: false,
            returnType: { displayName: ['Balance'] },
            selector: '0x38fa8912',
          },
          {
            args: [{ label: 'rate_percent', type: { displayName: ['u8'] } }],
            label: 'set_commission_rate',
            mutates: true,
            payable: false,
            returnType: { displayName: ['bool'] },
            selector: '0x6e29df01',
          },
        ],
        events: [
          {
            label: 'Staked',
            args: [
              { label: 'staker', indexed: true, type: { displayName: ['AccountId'] } },
              { label: 'validator', indexed: true, type: { displayName: ['AccountId'] } },
              { label: 'amount', indexed: false, type: { displayName: ['Balance'] } },
              { label: 'timestamp', indexed: false, type: { displayName: ['u64'] } },
            ],
          },
          {
            label: 'Unbonded',
            args: [
              { label: 'staker', indexed: true, type: { displayName: ['AccountId'] } },
              { label: 'amount', indexed: false, type: { displayName: ['Balance'] } },
              { label: 'era', indexed: false, type: { displayName: ['u32'] } },
            ],
          },
          {
            label: 'Slashed',
            args: [
              { label: 'validator', indexed: true, type: { displayName: ['AccountId'] } },
              { label: 'amount', indexed: false, type: { displayName: ['Balance'] } },
              { label: 'era', indexed: false, type: { displayName: ['u32'] } },
            ],
          },
          {
            label: 'RewardsClaimed',
            args: [
              { label: 'staker', indexed: true, type: { displayName: ['AccountId'] } },
              { label: 'amount', indexed: false, type: { displayName: ['Balance'] } },
            ],
          },
        ],
      },
      version: '5',
    },
    null,
    2
  ),
};

export const PRESET_REGISTRY: PresetContract = {
  id: 'registry',
  name: 'PeridexRegistry',
  vmType: 'EVM',
  address: '0x4204207770000000000000000000000000000001',
  description: 'The on-chain Peridex Schema Anchor & GRANDPA Finality Checkpoint contract on Portaldot V3.0.',
  jsonContent: JSON.stringify(
    [
      {
        type: 'function',
        name: 'registerSchema',
        inputs: [
          { name: 'targetContract', type: 'string', internalType: 'string' },
          { name: 'vmType', type: 'uint8', internalType: 'enum PeridexRegistry.VMType' },
          { name: 'schemaHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'apiEndpoint', type: 'string', internalType: 'string' },
          { name: 'mcpEndpoint', type: 'string', internalType: 'string' },
        ],
        outputs: [{ name: 'deploymentId', type: 'bytes32', internalType: 'bytes32' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'anchorFinalityCheckpoint',
        inputs: [
          { name: 'blockNumber', type: 'uint256', internalType: 'uint256' },
          { name: 'blockHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'stateRoot', type: 'bytes32', internalType: 'bytes32' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'isFinalized',
        inputs: [{ name: 'blockNumber', type: 'uint256', internalType: 'uint256' }],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'getDeploymentCount',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'getAllDeploymentIds',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32[]', internalType: 'bytes32[]' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'getDeployment',
        inputs: [{ name: 'deploymentId', type: 'bytes32', internalType: 'bytes32' }],
        outputs: [
          {
            name: '',
            type: 'tuple',
            components: [
              { name: 'registrant', type: 'address', internalType: 'address' },
              { name: 'targetContract', type: 'string', internalType: 'string' },
              { name: 'vmType', type: 'uint8', internalType: 'enum PeridexRegistry.VMType' },
              { name: 'schemaHash', type: 'bytes32', internalType: 'bytes32' },
              { name: 'apiEndpoint', type: 'string', internalType: 'string' },
              { name: 'mcpEndpoint', type: 'string', internalType: 'string' },
              { name: 'indexedAtBlock', type: 'uint256', internalType: 'uint256' },
              { name: 'active', type: 'bool', internalType: 'bool' },
            ],
            internalType: 'struct PeridexRegistry.SchemaDeployment',
          },
        ],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'latestCheckpointedBlock',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'event',
        name: 'SchemaRegistered',
        inputs: [
          { name: 'deploymentId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
          { name: 'targetContract', type: 'string', indexed: false, internalType: 'string' },
          { name: 'vmType', type: 'uint8', indexed: false, internalType: 'enum PeridexRegistry.VMType' },
          { name: 'schemaHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
        ],
        anonymous: false,
      },
      {
        type: 'event',
        name: 'FinalityCheckpointed',
        inputs: [
          { name: 'blockNumber', type: 'uint256', indexed: true, internalType: 'uint256' },
          { name: 'blockHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
        ],
        anonymous: false,
      },
    ],
    null,
    2
  ),
};

export const ALL_PRESETS = [PRESET_ERC20, PRESET_STAKING_INK, PRESET_REGISTRY];
