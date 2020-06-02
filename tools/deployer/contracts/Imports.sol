pragma solidity 0.5.16;

//Import all the contracts desired to be deployed
import "@airswap/validator/contracts/Validator.sol";
import "@airswap/delegate/contracts/DelegateFactory.sol";
import "@airswap/delegate/contracts/Delegate.sol";
import "@airswap/indexer/contracts/Indexer.sol";
import "@airswap/indexer/contracts/Index.sol";
import "@airswap/swap/contracts/Swap.sol";
import "@airswap/types/contracts/Types.sol";
import "@airswap/wrapper/contracts/Wrapper.sol";
import "@airswap/transfers/contracts/TransferHandlerRegistry.sol";
import "@airswap/transfers/contracts/handlers/ERC1155TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC20TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/ERC721TransferHandler.sol";
import "@airswap/transfers/contracts/handlers/KittyCoreTransferHandler.sol";

contract Imports {}
