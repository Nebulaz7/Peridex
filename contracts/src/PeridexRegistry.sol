// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PeridexRegistry
 * @notice On-chain schema anchor and finality checkpoint registry for Portaldot Network V3.0.
 * Peridex provides "ABI in, API out" Dual-VM Backend-as-a-Service for both EVM (Solidity)
 * and WASM (Rust ink! V5) contracts executing on Portaldot.
 */
contract PeridexRegistry {
    /// @notice Target Virtual Machine type on Portaldot Network V3.0
    enum VMType {
        EVM,
        INK_WASM
    }

    /// @notice Schema deployment record anchoring the API & MCP endpoints to the on-chain schema hash
    struct SchemaDeployment {
        address registrant;
        string targetContract;
        VMType vmType;
        bytes32 schemaHash;
        string apiEndpoint;
        string mcpEndpoint;
        uint256 indexedAtBlock;
        bool active;
    }

    /// @notice Checkpoint record of finalized block state
    struct FinalityCheckpoint {
        bytes32 blockHash;
        bytes32 stateRoot;
        uint256 timestamp;
        bool exists;
    }

    // Storage
    mapping(bytes32 => SchemaDeployment) public deployments;
    bytes32[] public deploymentIds;
    mapping(uint256 => FinalityCheckpoint) public finalityCheckpoints;
    uint256 public latestCheckpointedBlock;
    address public owner;

    // Events
    event SchemaRegistered(
        bytes32 indexed deploymentId,
        string targetContract,
        VMType vmType,
        bytes32 schemaHash
    );

    event FinalityCheckpointed(
        uint256 indexed blockNumber,
        bytes32 blockHash
    );

    event SchemaDeactivated(bytes32 indexed deploymentId);

    modifier onlyOwner() {
        require(msg.sender == owner, "PeridexRegistry: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registers a normalized contract schema and anchors its hash and endpoints on-chain
     * @param targetContract Address of the contract (0x... for EVM or SS58 5... for ink! WASM)
     * @param vmType Execution VM type: EVM (0) or INK_WASM (1)
     * @param schemaHash Keccak256 hash of the normalized Unified Intermediate Representation (UIR)
     * @param apiEndpoint Generated REST & GraphQL API base endpoint
     * @param mcpEndpoint Generated Model Context Protocol (MCP) server endpoint
     * @return deploymentId Unique identifier for the registered schema
     */
    function registerSchema(
        string calldata targetContract,
        VMType vmType,
        bytes32 schemaHash,
        string calldata apiEndpoint,
        string calldata mcpEndpoint
    ) external returns (bytes32 deploymentId) {
        require(bytes(targetContract).length > 0, "PeridexRegistry: targetContract empty");
        require(schemaHash != bytes32(0), "PeridexRegistry: schemaHash empty");

        deploymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                targetContract,
                vmType,
                schemaHash,
                block.number,
                deploymentIds.length
            )
        );

        deployments[deploymentId] = SchemaDeployment({
            registrant: msg.sender,
            targetContract: targetContract,
            vmType: vmType,
            schemaHash: schemaHash,
            apiEndpoint: apiEndpoint,
            mcpEndpoint: mcpEndpoint,
            indexedAtBlock: block.number,
            active: true
        });

        deploymentIds.push(deploymentId);

        emit SchemaRegistered(deploymentId, targetContract, vmType, schemaHash);
    }

    /**
     * @notice Anchors a finalized block checkpoint to safeguard against reorgs
     * @param blockNumber Height of the finalized block
     * @param blockHash Canonical block hash from Portaldot GRANDPA finality
     * @param stateRoot State root of the block
     */
    function anchorFinalityCheckpoint(
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 stateRoot
    ) external {
        require(blockNumber > 0, "PeridexRegistry: invalid block number");
        require(blockHash != bytes32(0), "PeridexRegistry: invalid block hash");

        finalityCheckpoints[blockNumber] = FinalityCheckpoint({
            blockHash: blockHash,
            stateRoot: stateRoot,
            timestamp: block.timestamp,
            exists: true
        });

        if (blockNumber > latestCheckpointedBlock) {
            latestCheckpointedBlock = blockNumber;
        }

        emit FinalityCheckpointed(blockNumber, blockHash);
    }

    /**
     * @notice Checks if a given block number has been anchored as finalized
     */
    function isFinalized(uint256 blockNumber) external view returns (bool) {
        return finalityCheckpoints[blockNumber].exists;
    }

    /**
     * @notice Retrieves the total number of registered schemas
     */
    function getDeploymentCount() external view returns (uint256) {
        return deploymentIds.length;
    }

    /**
     * @notice Returns all registered deployment IDs
     */
    function getAllDeploymentIds() external view returns (bytes32[] memory) {
        return deploymentIds;
    }

    /**
     * @notice Retrieves full deployment details by deployment ID
     */
    function getDeployment(bytes32 deploymentId)
        external
        view
        returns (SchemaDeployment memory)
    {
        return deployments[deploymentId];
    }

    /**
     * @notice Retrieves checkpoint details for a given block number
     */
    function getCheckpoint(uint256 blockNumber)
        external
        view
        returns (bytes32 blockHash, bytes32 stateRoot, uint256 timestamp)
    {
        FinalityCheckpoint memory cp = finalityCheckpoints[blockNumber];
        require(cp.exists, "PeridexRegistry: checkpoint does not exist");
        return (cp.blockHash, cp.stateRoot, cp.timestamp);
    }
}
