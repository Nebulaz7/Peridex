// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PeridexRegistry} from "../src/PeridexRegistry.sol";

/**
 * @title DeployPeridexRegistry
 * @notice Broadcast deployment script for Portaldot Network V3.0 Testnet
 * Chain ID: 420420777
 * RPC: https://test-evm-rpc-v3.portaldot.dev
 */
contract DeployPeridexRegistry is Script {
    function run() external returns (PeridexRegistry registry) {
        // Retrieve deployer private key from environment or fallback to default test key
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        address deployer = vm.addr(deployerPrivateKey);
        console2.log("Deploying PeridexRegistry on Portaldot Network V3.0");
        console2.log("Deployer Address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        registry = new PeridexRegistry();
        console2.log("PeridexRegistry deployed at:", address(registry));

        // 1. Anchor Initial Schema for Preset 1: ERC20 Portal Token (EVM)
        bytes32 erc20SchemaHash = keccak256("ERC20PortalToken_UIR_v1_Schema");
        bytes32 erc20DeployId = registry.registerSchema(
            "0x71C8360f3E10D7C014E8C61E70F1C7892927289A",
            PeridexRegistry.VMType.EVM,
            erc20SchemaHash,
            "https://api.peridex.io/v1/portaldot/0x71C8360f3E10D7C014E8C61E70F1C7892927289A",
            "https://mcp.peridex.io/v1/portaldot/0x71C8360f3E10D7C014E8C61E70F1C7892927289A/mcp.json"
        );
        console2.log("Anchored ERC20 EVM Schema ID:");
        console2.logBytes32(erc20DeployId);

        // 2. Anchor Initial Schema for Preset 2: Portal Staking (ink! WASM)
        bytes32 stakingSchemaHash = keccak256("PortalStakingInk_UIR_v5_Schema");
        bytes32 stakingDeployId = registry.registerSchema(
            "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            PeridexRegistry.VMType.INK_WASM,
            stakingSchemaHash,
            "https://api.peridex.io/v1/portaldot/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            "https://mcp.peridex.io/v1/portaldot/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY/mcp.json"
        );
        console2.log("Anchored Staking ink! WASM Schema ID:");
        console2.logBytes32(stakingDeployId);

        // 3. Anchor Initial Finality Checkpoint (Block #1,482,908)
        registry.anchorFinalityCheckpoint(
            1482908,
            0x9f83a48e918239a039840291e0892019b8c382109e84739281a0392810938472,
            0x4728109384729f83a48e918239a039840291e0892019b8c382109e84739281a0
        );
        console2.log("Anchored Initial Finality Checkpoint at Block #1482908");

        vm.stopBroadcast();
    }
}
