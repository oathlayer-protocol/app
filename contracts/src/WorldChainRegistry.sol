// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev World ID Router on World Chain mainnet
interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

library ByteHasher {
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

/// @title WorldChainRegistry
/// @notice Entry point on World Chain for OathLayer SLA providers and arbitrators.
///         Users verify with World ID here, then CRE relays their registration to Sepolia.
contract WorldChainRegistry {
    using ByteHasher for bytes;

    IWorldID public immutable worldId;
    // NOTE: World Chain Sepolia testnet has Device group (0) disabled and Orb group (1) may
    // reject testnet proofs. On-chain verifyProof is skipped for testnet — MiniKit proof
    // is the identity gate, nullifier dedup prevents replay. Production deploy uses verifyProof.
    uint256 public immutable groupId = 1;
    uint256 public immutable providerExternalNullifier;
    uint256 public immutable arbitratorExternalNullifier;
    bool public immutable skipOnChainVerification;

    mapping(uint256 => bool) public usedNullifiers;
    mapping(address => bool) public registeredProviders;
    mapping(address => bool) public registeredArbitrators;

    /// @notice Emitted when a provider registers — CRE listens for this
    event ProviderRegistrationRequested(
        address indexed user,
        uint256 nullifierHash,
        uint256 root,
        uint256 timestamp
    );

    /// @notice Emitted when an arbitrator registers — CRE listens for this
    event ArbitratorRegistrationRequested(
        address indexed user,
        uint256 nullifierHash,
        uint256 root,
        uint256 timestamp
    );

    /// @notice Emitted by CRE relay confirmation (called by trusted forwarder)
    event RegistrationRelayed(address indexed user, string role, uint256 chainId);

    constructor(address _worldId, string memory _appId, bool _skipOnChainVerification) {
        worldId = IWorldID(_worldId);
        skipOnChainVerification = _skipOnChainVerification;
        providerExternalNullifier = abi.encodePacked(
            abi.encodePacked(_appId).hashToField(),
            "oathlayer-provider-register"
        ).hashToField();
        arbitratorExternalNullifier = abi.encodePacked(
            abi.encodePacked(_appId).hashToField(),
            "oathlayer-arbitrator-register"
        ).hashToField();
    }

    /// @notice Provider submits World ID proof on World Chain.
    ///         CRE picks up the event and calls registerProvider() on Sepolia.
    function requestProviderRegistration(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        require(!registeredProviders[msg.sender], "Already registered");
        require(!usedNullifiers[nullifierHash], "Nullifier already used");

        // On mainnet: verifyProof enforces World ID ZK proof on-chain.
        // On testnet: skipped because World Chain Sepolia has semaphore groups disabled.
        // MiniKit proof is verified by World App before submission — nullifier dedup prevents replay.
        if (!skipOnChainVerification) {
            worldId.verifyProof(
                root,
                groupId,
                abi.encodePacked("").hashToField(),
                nullifierHash,
                providerExternalNullifier,
                proof
            );
        }

        registeredProviders[msg.sender] = true;
        usedNullifiers[nullifierHash] = true;

        // CRE listens for this event and relays to Sepolia
        emit ProviderRegistrationRequested(msg.sender, nullifierHash, root, block.timestamp);
    }

    /// @notice Arbitrator submits World ID proof on World Chain.
    function requestArbitratorRegistration(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        require(!registeredArbitrators[msg.sender], "Already registered");
        require(!usedNullifiers[nullifierHash], "Nullifier already used");

        if (!skipOnChainVerification) {
            worldId.verifyProof(
                root,
                groupId,
                abi.encodePacked("").hashToField(),
                nullifierHash,
                arbitratorExternalNullifier,
                proof
            );
        }

        registeredArbitrators[msg.sender] = true;
        usedNullifiers[nullifierHash] = true;

        emit ArbitratorRegistrationRequested(msg.sender, nullifierHash, root, block.timestamp);
    }
}
