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
  mapping (bytes4 => ITransferHandler) private transferHandlerMapping;

  /**
  * @notice Adds handler to mapping
  * @param kind bytes4
  * @param transferHandler ITransferHandler
  */
  function addTransferHandler(bytes4 kind, ITransferHandler transferHandler)
    external {
      require(address(transferHandlerMapping[kind]) == address(0x0), "HANDLER_EXISTS_FOR_KIND");
      transferHandlerMapping[kind] = transferHandler;
      emit AddTransferHandler(kind, address(transferHandler));
    }

  /**
  * @notice Fetches from the transfer handler mapping
  * @dev will return 0x0 if not in mapping
  * @param kind bytes4
  * @return ITransferHandler return
  */
  function getTransferHandler(bytes4 kind) external
    view returns (ITransferHandler) {
    return transferHandlerMapping[kind];
  }
}