pragma solidity 0.5.12;

import "@airswap/tokens/contracts/FungibleToken.sol";
import "@airswap/tokens/contracts/OMGToken.sol";
import "@airswap/tokens/contracts/NonFungibleToken.sol";
import "@airswap/tokens/contracts/AdaptedKittyERC721.sol";
import "@airswap/tokens/contracts/MintableERC1155Token.sol";
import "@airswap/tokens/contracts/WETH9.sol";
import "@airswap/swap/contracts/Swap.sol";
import "@airswap/delegate/contracts/Delegate.sol";
import "@airswap/indexer/contracts/Indexer.sol";
import "@airswap/swap/contracts/Swap.sol";
import "@airswap/types/contracts/Types.sol";
import "@airswap/transfers/contracts/TransferHandlerRegistry.sol";
import "@airswap/transfers/contracts/handlers/ERC20TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC721TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC1155TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/KittyCoreTransferHandler.sol";
import "@gnosis.pm/mock-contract/contracts/MockContract.sol";

contract Imports {}
