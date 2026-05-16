// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GameItems
 * @dev ERC-721 game items for Beyond The Fog.
 *      Each item is a unique NFT with a name, description, and tokenURI pointing to 0G Storage.
 *      Frontend uses Transfer events + getItem(tokenId) — this contract matches that interface exactly.
 */
contract GameItems is ERC721URIStorage, Ownable, ReentrancyGuard {

    struct Item {
        string name;
        string description;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => Item) private _items;

    event ItemMinted(address indexed to, uint256 indexed tokenId, string name);

    constructor() ERC721("Beyond The Fog Items", "BTFI") Ownable(msg.sender) {}

    /**
     * @notice Mint a game item NFT to a player.
     * @dev Called by the backend (owner) OR directly by the player via frontend.
     *      Emits a standard ERC-721 Transfer event which the frontend parses.
     * @param to        Recipient address
     * @param tokenURI_ Metadata URI (0G Storage CID or backend URL)
     * @param name      Human-readable item name (e.g. "Fishing Rod")
     * @param description Short description of the item
     */
    function mintItemTo(
        address to,
        string memory tokenURI_,
        string memory name,
        string memory description
    ) external nonReentrant returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _items[tokenId] = Item({ name: name, description: description });

        emit ItemMinted(to, tokenId, name);
        return tokenId;
    }

    /**
     * @notice Owner-only batch mint (backend-sponsored flow).
     */
    function mint(
        address to,
        string memory tokenURI_,
        string memory name,
        string memory description
    ) external onlyOwner nonReentrant returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _items[tokenId] = Item({ name: name, description: description });

        emit ItemMinted(to, tokenId, name);
        return tokenId;
    }

    /**
     * @notice Get item metadata by tokenId.
     * @dev Frontend calls: const [name] = await gameItemsContract.getItem(tokenId)
     */
    function getItem(uint256 tokenId) external view returns (string memory name, string memory description) {
        require(_ownerOf(tokenId) != address(0), "Item does not exist");
        Item memory item = _items[tokenId];
        return (item.name, item.description);
    }

    /**
     * @notice Returns total items minted.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
