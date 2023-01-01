// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

error HandlerExistsForKind();

/**
 * @title TransferHandlerRegistry: holds registry of contract to
 * facilitate token transfers
 */
contract TransferHandlerRegistry is Ownable {
  // Mapping of bytes4 to contract interface type
  mapping(bytes4 => ITransferHandler) public transferHandlers;

  /**
   * @notice Contract Events
   */
  event AddTransferHandler(bytes4 kind, address contractAddress);

  /**
   * @notice Adds handler to mapping
   * @param kind bytes4 Key value that defines a token type
   * @param transferHandler ITransferHandler
   */
  function addTransferHandler(bytes4 kind, ITransferHandler transferHandler)
    external
    onlyOwner
  {
    if (address(transferHandlers[kind]) != address(0))
      revert HandlerExistsForKind();
    transferHandlers[kind] = transferHandler;
    emit AddTransferHandler(kind, address(transferHandler));
  }
}
