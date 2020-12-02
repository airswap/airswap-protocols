pragma solidity 0.5.16;

import "@airswap/tokens/contracts/MintableERC1155Token.sol";
import "@airswap/tokens/contracts/FungibleToken.sol";
import "@airswap/tokens/contracts/NonFungibleToken.sol";
import "@airswap/tokens/contracts/AdaptedKittyERC721.sol";
import "@airswap/tokens/contracts/WETH9.sol";
import "@airswap/swap/contracts/Swap.sol";
import "@airswap/transfers/contracts/handlers/ERC20TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC721TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC1155TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/KittyCoreTransferHandler.sol";
import "@airswap/wrapper/contracts/Wrapper.sol";
import "@airswap/indexer/contracts/Indexer.sol";
import "@airswap/delegate/contracts/Delegate.sol";

contract Imports {}
