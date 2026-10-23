// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {PeridexRegistry} from "../src/PeridexRegistry.sol";

contract PeridexRegistryTest is Test {
    PeridexRegistry public registry;

    address public alice = address(0x1111);
    address public bob = address(0x2222);

    event SchemaRegistered(
        bytes32 indexed deploymentId,
        string targetContract,
        PeridexRegistry.VMType vmType,
        bytes32 schemaHash
    );

    event FinalityCheckpointed(
        uint256 indexed blockNumber,
        bytes32 blockHash
    );

    function setUp() public {
        registry = new PeridexRegistry();
    }

    function test_RegisterEVMSchema() public {
        vm.prank(alice);

        string memory targetContract = "0x71C8360f3E10D7C014E8C61E70F1C7892927289A";
        bytes32 schemaHash = keccak256("ERC20PortalToken_UIR_v1");
        string memory apiEndpoint = "https://api.peridex.io/v1/portaldot/0x71C...89A";
        string memory mcpEndpoint = "https://mcp.peridex.io/v1/portaldot/0x71C...89A";

        vm.expectEmit(false, false, false, true);
        emit SchemaRegistered(
            bytes32(0),
            targetContract,
            PeridexRegistry.VMType.EVM,
            schemaHash
        );

        bytes32 deploymentId = registry.registerSchema(
            targetContract,
            PeridexRegistry.VMType.EVM,
            schemaHash,
            apiEndpoint,
            mcpEndpoint
        );

        assertTrue(deploymentId != bytes32(0), "Deployment ID should not be zero");

        PeridexRegistry.SchemaDeployment memory dep = registry.getDeployment(deploymentId);
        assertEq(dep.registrant, alice, "Registrant should be Alice");
        assertEq(dep.targetContract, targetContract, "Target contract mismatch");
        assertTrue(dep.vmType == PeridexRegistry.VMType.EVM, "VMType should be EVM");
        assertEq(dep.schemaHash, schemaHash, "Schema hash mismatch");
        assertEq(dep.apiEndpoint, apiEndpoint, "API endpoint mismatch");
        assertEq(dep.mcpEndpoint, mcpEndpoint, "MCP endpoint mismatch");
        assertTrue(dep.active, "Deployment should be active");
        assertEq(registry.getDeploymentCount(), 1, "Count should be 1");
    }

    function test_RegisterInkWASMSchema() public {
        vm.prank(bob);

        // Substrate SS58 Account ID for ink! WASM contract
        string memory targetContract = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
        bytes32 schemaHash = keccak256("PortalStakingInk_UIR_v5");
        string memory apiEndpoint = "https://api.peridex.io/v1/portaldot/5Grw...utQY";
        string memory mcpEndpoint = "https://mcp.peridex.io/v1/portaldot/5Grw...utQY";

        bytes32 deploymentId = registry.registerSchema(
            targetContract,
            PeridexRegistry.VMType.INK_WASM,
            schemaHash,
            apiEndpoint,
            mcpEndpoint
        );

        PeridexRegistry.SchemaDeployment memory dep = registry.getDeployment(deploymentId);
        assertEq(dep.registrant, bob, "Registrant should be Bob");
        assertEq(dep.targetContract, targetContract, "Target contract mismatch");
        assertTrue(dep.vmType == PeridexRegistry.VMType.INK_WASM, "VMType should be INK_WASM");
        assertEq(dep.schemaHash, schemaHash, "Schema hash mismatch");
        assertEq(registry.getDeploymentCount(), 1, "Count should be 1");
    }

    function test_RevertOnEmptyTargetContract() public {
        bytes32 schemaHash = keccak256("TestSchema");
        vm.expectRevert("PeridexRegistry: targetContract empty");
        registry.registerSchema(
            "",
            PeridexRegistry.VMType.EVM,
            schemaHash,
            "api",
            "mcp"
        );
    }

    function test_RevertOnZeroSchemaHash() public {
        vm.expectRevert("PeridexRegistry: schemaHash empty");
        registry.registerSchema(
            "0x123",
            PeridexRegistry.VMType.EVM,
            bytes32(0),
            "api",
            "mcp"
        );
    }

    function test_AnchorFinalityCheckpoint() public {
        uint256 blockNumber = 1482908;
        bytes32 blockHash = 0x9f83a48e918239a039840291e0892019b8c382109e84739281a0392810938472;
        bytes32 stateRoot = 0x4728109384729f83a48e918239a039840291e0892019b8c382109e84739281a0;

        assertFalse(registry.isFinalized(blockNumber), "Should not be finalized before anchor");

        vm.expectEmit(true, false, false, true);
        emit FinalityCheckpointed(blockNumber, blockHash);

        registry.anchorFinalityCheckpoint(blockNumber, blockHash, stateRoot);

        assertTrue(registry.isFinalized(blockNumber), "Should be finalized after anchor");
        assertEq(registry.latestCheckpointedBlock(), blockNumber, "Latest block mismatch");

        (bytes32 retrievedHash, bytes32 retrievedStateRoot, ) = registry.getCheckpoint(blockNumber);
        assertEq(retrievedHash, blockHash, "Block hash mismatch");
        assertEq(retrievedStateRoot, stateRoot, "State root mismatch");
    }

    function test_MultipleRegistrations() public {
        bytes32 hash1 = keccak256("hash1");
        bytes32 hash2 = keccak256("hash2");

        bytes32 id1 = registry.registerSchema("0xAAA", PeridexRegistry.VMType.EVM, hash1, "api1", "mcp1");
        bytes32 id2 = registry.registerSchema("5BBB", PeridexRegistry.VMType.INK_WASM, hash2, "api2", "mcp2");

        assertTrue(id1 != id2, "Deployment IDs must be unique");
        assertEq(registry.getDeploymentCount(), 2, "Count should be 2");

        bytes32[] memory allIds = registry.getAllDeploymentIds();
        assertEq(allIds.length, 2, "List length should be 2");
        assertEq(allIds[0], id1);
        assertEq(allIds[1], id2);
    }
}
