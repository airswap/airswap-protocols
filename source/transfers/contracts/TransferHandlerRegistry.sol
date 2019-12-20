pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";

/**
  * @title TransferHandlerRegistry: holds registry of contract to
  * facilitate token transfers
  */
contract TransferHandlerRegistry {

  event AddTransferHandler(
    bytes4 kind,
    address contractAddress
  );

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => ITransferHandler) public transferHandlers;

  /**
  * @notice Adds handler to mapping
  * @param kind bytes4 Key value that defines a token type
  * @param transferHandler ITransferHandler
  */
  function addTransferHandler(bytes4 kind, ITransferHandler transferHandler)
    external {
      require(address(transferHandlers[kind]) == address(0), "HANDLER_EXISTS_FOR_KIND");
      transferHandlers[kind] = transferHandler;
      emit AddTransferHandler(kind, address(transferHandler));
    }

  /**
  * @notice Fetches from the transfer handler mapping
  * @dev will return address(0) if not in mapping
  * @param kind bytes4 Key value that defines a token type
  * @return ITransferHandler return
  */
  function getTransferHandler(bytes4 kind) external
    view returns (ITransferHandler) {
    return transferHandlers[kind];
  }
}