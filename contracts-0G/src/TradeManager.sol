// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TradeManager
 * @dev Atomic escrow P2P NFT marketplace. Trades NFTs for Wrapped 0G (WrappedOGBase).
 *      WrappedOGBase is the official 0G precompile at 0x0000000000000000000000000000000000001001
 *      on both Galileo testnet and Aristotle mainnet. Works like WETH.
 *      Includes a 2.5% protocol fee sent to the owner (treasury).
 */
contract TradeManager is Ownable, ReentrancyGuard {

    struct Trade {
        address creator;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    Trade[] public trades;

    /// @dev WrappedOGBase precompile — official 0G wrapped native token (same on testnet + mainnet)
    IERC20 public constant wrappedOG = IERC20(0x0000000000000000000000000000000000001001);

    /// @dev Protocol fee in basis points (250 = 2.5%)
    uint256 public feeBps = 250;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% hard cap

    event TradeCreated(uint256 indexed tradeId, address indexed creator, uint256 tokenId, uint256 price);
    event TradeCompleted(uint256 indexed tradeId, address indexed buyer, uint256 fee);
    event TradeCancelled(uint256 indexed tradeId);
    event FeeUpdated(uint256 newFeeBps);

    constructor() Ownable(msg.sender) {}

    /// @notice List an NFT for sale at a FOG price
    function createTrade(address nftContract, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be > 0");
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        trades.push(Trade({
            creator: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        }));

        emit TradeCreated(trades.length - 1, msg.sender, tokenId, price);
    }

    /// @notice Buy a listed NFT — pays seller minus fee, fee goes to treasury
    function completeTrade(uint256 tradeId) external nonReentrant {
        require(tradeId < trades.length, "Invalid tradeId");
        Trade storage trade = trades[tradeId];
        require(trade.active, "Trade not active");
        require(msg.sender != trade.creator, "Cannot buy own trade");

        trade.active = false;

        uint256 fee = (trade.price * feeBps) / 10000;
        uint256 sellerAmount = trade.price - fee;

        // Transfer Wrapped 0G from buyer to seller (minus fee)
        require(wrappedOG.transferFrom(msg.sender, trade.creator, sellerAmount), "W0G transfer to seller failed");

        // Transfer fee to treasury (owner)
        if (fee > 0) {
            require(wrappedOG.transferFrom(msg.sender, owner(), fee), "W0G fee transfer failed");
        }

        // Transfer NFT to buyer
        IERC721(trade.nftContract).safeTransferFrom(address(this), msg.sender, trade.tokenId);

        emit TradeCompleted(tradeId, msg.sender, fee);
    }

    /// @notice Cancel a listing and reclaim the NFT
    function cancelTrade(uint256 tradeId) external nonReentrant {
        require(tradeId < trades.length, "Invalid tradeId");
        Trade storage trade = trades[tradeId];
        require(msg.sender == trade.creator, "Not creator");
        require(trade.active, "Trade not active");

        trade.active = false;
        IERC721(trade.nftContract).safeTransferFrom(address(this), trade.creator, trade.tokenId);

        emit TradeCancelled(tradeId);
    }

    /// @notice Owner can update the protocol fee (max 10%)
    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    /// @notice Returns total number of trades ever created
    function tradesCount() external view returns (uint256) {
        return trades.length;
    }
}
