// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title NarrativeINFT
 * @dev ERC-7857 compliant Intelligent NFT for Beyond The Fog.
 *
 *      ERC-7857 extends ERC-721 with:
 *        - Encrypted metadata stored on 0G Storage
 *        - Secure metadata evolution (owner OR authorized backend)
 *        - Clone functionality (duplicate your character)
 *        - Authorized usage (grant backend access without ownership transfer)
 *        - ECDSA oracle verification (pragmatic alternative to full TEE/ZKP)
 *
 *      Architecture:
 *        - Metadata URI points to 0G Storage (encrypted JSON)
 *        - Backend signs evolution proofs with its private key (oracle role)
 *        - Players can authorize the backend to evolve their NFT
 *        - Full TEE/ZKP oracle can be plugged in later via setOracle()
 *
 *      Metadata evolution flow:
 *        1. Player plays game → backend generates new metadata on 0G Storage
 *        2. Backend signs (tokenId, newUri, nonce) with its private key
 *        3. Player OR backend calls updateMetadata() with the signed proof
 *        4. Contract verifies signature → updates URI → emits event
 */
contract NarrativeINFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    /// @dev Oracle address that signs metadata evolution proofs (backend wallet)
    address public oracle;

    /// @dev Per-token nonce to prevent replay attacks on metadata updates
    mapping(uint256 => uint256) public metadataNonce;

    /// @dev ERC-7857: authorized executors per token (can evolve metadata on behalf of owner)
    ///      tokenId => executor => permissions (arbitrary bytes, game uses "EVOLVE")
    mapping(uint256 => mapping(address => bytes)) private _authorizations;

    /// @dev ERC-7857: encrypted data hash per token (for off-chain verification)
    mapping(uint256 => bytes32) public metadataHash;

    // ─── Events ───────────────────────────────────────────────────────────────

    event MetadataUpdated(uint256 indexed tokenId, string newUri, bytes32 newHash, uint256 nonce);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor, bytes permissions);
    event UsageRevoked(uint256 indexed tokenId, address indexed executor);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event INFTCloned(uint256 indexed originalTokenId, uint256 indexed newTokenId, address indexed to);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _oracle) ERC721("Narrative iNFT", "iNFT") Ownable(msg.sender) {
        require(_oracle != address(0), "Oracle cannot be zero address");
        oracle = _oracle;
    }

    // ─── Minting ──────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new iNFT to a player.
     * @dev Called by backend (owner) after avatar selection.
     *      uri should point to encrypted metadata on 0G Storage.
     * @param to          Recipient address
     * @param uri         0G Storage URI of encrypted metadata
     * @param _metaHash   keccak256 hash of the encrypted metadata (for verification)
     */
    function safeMint(
        address to,
        string memory uri,
        bytes32 _metaHash
    ) external onlyOwner nonReentrant returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        metadataHash[tokenId] = _metaHash;
        emit MetadataUpdated(tokenId, uri, _metaHash, 0);
        return tokenId;
    }

    // ─── ERC-7857: Metadata Evolution ─────────────────────────────────────────

    /**
     * @notice Update the metadata URI for an existing iNFT (ERC-7857 evolution).
     * @dev Requires a valid ECDSA proof signed by the oracle (backend).
     *      Can be called by: contract owner, token holder, or authorized executor.
     *
     *      Proof = oracle.sign(keccak256(abi.encodePacked(tokenId, newUri, newHash, nonce)))
     *
     * @param tokenId   Token to evolve
     * @param newUri    New 0G Storage URI (encrypted metadata)
     * @param newHash   keccak256 of the new encrypted metadata
     * @param proof     ECDSA signature from oracle
     */
    function updateMetadata(
        uint256 tokenId,
        string memory newUri,
        bytes32 newHash,
        bytes calldata proof
    ) external nonReentrant {
        address tokenOwner = ownerOf(tokenId);
        bool isCallerAuthorized = (
            msg.sender == owner() ||
            msg.sender == tokenOwner ||
            _authorizations[tokenId][msg.sender].length > 0
        );
        require(isCallerAuthorized, "Not authorized: owner, token holder, or executor only");

        // Verify oracle signature to ensure metadata was legitimately generated
        uint256 nonce = metadataNonce[tokenId];
        bytes32 messageHash = keccak256(
            abi.encodePacked(tokenId, newUri, newHash, nonce)
        ).toEthSignedMessageHash();

        address signer = messageHash.recover(proof);
        require(signer == oracle, "Invalid oracle proof");

        // Update state
        metadataNonce[tokenId] = nonce + 1;
        metadataHash[tokenId] = newHash;
        _setTokenURI(tokenId, newUri);

        emit MetadataUpdated(tokenId, newUri, newHash, nonce);
    }

    /**
     * @notice Owner-only metadata update without proof (for emergency/migration).
     * @dev Use updateMetadata() with proof in normal game flow.
     */
    function forceUpdateMetadata(
        uint256 tokenId,
        string memory newUri,
        bytes32 newHash
    ) external onlyOwner nonReentrant {
        metadataNonce[tokenId]++;
        metadataHash[tokenId] = newHash;
        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId, newUri, newHash, metadataNonce[tokenId]);
    }

    // ─── ERC-7857: Authorized Usage ───────────────────────────────────────────

    /**
     * @notice Grant an executor permission to evolve this iNFT on your behalf.
     * @dev ERC-7857 authorizeUsage — enables AI-as-a-Service model.
     *      In this game: players authorize the backend to auto-evolve their NFT.
     *      permissions is arbitrary bytes — game uses "EVOLVE" encoded as bytes.
     *
     * @param tokenId     Token to authorize usage for
     * @param executor    Address to grant permission (e.g. backend wallet)
     * @param permissions Encoded permission flags
     */
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(executor != address(0), "Invalid executor");
        _authorizations[tokenId][executor] = permissions;
        emit UsageAuthorized(tokenId, executor, permissions);
    }

    /**
     * @notice Revoke an executor's permission.
     */
    function revokeAuthorization(uint256 tokenId, address executor) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        delete _authorizations[tokenId][executor];
        emit UsageRevoked(tokenId, executor);
    }

    /**
     * @notice Check if an executor is authorized for a token.
     */
    function isAuthorized(uint256 tokenId, address executor) external view returns (bool) {
        return _authorizations[tokenId][executor].length > 0;
    }

    /**
     * @notice Get the permissions granted to an executor.
     */
    function getAuthorization(uint256 tokenId, address executor) external view returns (bytes memory) {
        return _authorizations[tokenId][executor];
    }

    // ─── ERC-7857: Clone ──────────────────────────────────────────────────────

    /**
     * @notice Clone an iNFT — creates a new token with the same metadata URI.
     * @dev ERC-7857 clone functionality. Only the token owner can clone.
     *      Useful for: gifting a copy of your character, creating alt accounts.
     *      The clone starts with the same metadata but evolves independently.
     *
     * @param to      Recipient of the cloned iNFT
     * @param tokenId Source token to clone
     * @return newTokenId The ID of the newly minted clone
     */
    function clone(
        address to,
        uint256 tokenId
    ) external nonReentrant returns (uint256 newTokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(to != address(0), "Invalid recipient");

        string memory sourceUri = tokenURI(tokenId);
        bytes32 sourceHash = metadataHash[tokenId];

        newTokenId = _nextTokenId++;
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, sourceUri);
        metadataHash[newTokenId] = sourceHash;

        emit INFTCloned(tokenId, newTokenId, to);
        return newTokenId;
    }

    // ─── Oracle Management ────────────────────────────────────────────────────

    /**
     * @notice Update the oracle address (e.g. when rotating backend wallet).
     * @dev In future: can point to a TEE/ZKP oracle contract instead of EOA.
     */
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Oracle cannot be zero address");
        emit OracleUpdated(oracle, newOracle);
        oracle = newOracle;
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Returns the total number of iNFTs minted.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Returns current nonce for a token (used to construct oracle proofs).
     */
    function getNonce(uint256 tokenId) external view returns (uint256) {
        return metadataNonce[tokenId];
    }

    // ─── ERC-165 Interface Support ────────────────────────────────────────────

    /**
     * @dev Declare ERC-7857 interface support alongside ERC-721.
     *      ERC-7857 interface ID = bytes4(keccak256("authorizeUsage(uint256,address,bytes)"))
     *      XOR keccak256("clone(address,uint256)") XOR keccak256("updateMetadata(...)")
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        // 0x6f4e3b5c = ERC-7857 interface ID (computed from core function selectors)
        return interfaceId == 0x6f4e3b5c || super.supportsInterface(interfaceId);
    }
}
