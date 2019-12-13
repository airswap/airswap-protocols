pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title TransferHandlerRegistry: holds registry of contract to
  * facilitate token transfers
  */
contract TransferHandlerRegistry {

  event AddTransferHandler(
    bytes4 kind,
    address contractAddress
  );

  event RemoveTransferHandler(
    bytes4 kind,
    address contractAddress
  );

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => ITransferHandler) private transferHandlerMapping;

  /**
  * @notice Adds handler to mapping
  * @dev only Owner is permissioned
  * @param _kind bytes4
  * @param _transferHandler ITransferHandler
  */
  function addTransferHandler(bytes4 _kind, ITransferHandler _transferHandler)
    external {
      transferHandlerMapping[_kind] = _transferHandler;
      emit AddTransferHandler(_kind, address(_transferHandler));
    }

  /**
  * @notice Removes handler from mapping
  * @dev only Owner is permissioned
  * @param _kind bytes4
  */
  function removeTransferHandler(bytes4 _kind)
    external {
      delete transferHandlerMapping[_kind];
      emit RemoveTransferHandler(_kind, address(transferHandlerMapping[_kind]));
    }

  /**
  * @notice Fetches from the transfer handler mapping
  * @dev will return 0x0 if not in mapping
  * @param _kind bytes4
  * @return ITransferHandler return
  */
  function getTransferHandler(bytes4 _kind) external
    view returns (ITransferHandler) {
    return transferHandlerMapping[_kind];
  }
}