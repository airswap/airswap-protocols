
pragma solidity 0.5.10;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title TransferHandlerRegistry: holds registry of contract to
  * facilitate token transfers
  */
contract TransferHandlerRegistry is Ownable {

  event AddHandler(bytes4 kind, address contractAddress);
  event RemoveHandler(bytes4 kind, address contractAddress);

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => ITransferHandler) private transferHandlerMapping;

  /**
  * @notice Adds handler to mapping
  * @dev only Owner is permissioned
  * @param _kind bytes4
  * @param _transferHandler ITransferHandler
  */
  function addHandler(bytes4 _kind, ITransferHandler _transferHandler)
    external onlyOwner {
    transferHandlerMapping[_kind] = _transferHandler;
    emit AddHandler(_kind, address(_transferHandler));
  }

  /**
  * @notice Removes handler from mapping
  * @dev only Owner is permissioned
  * @param _kind bytes4
  */
  function removeHandler(bytes4 _kind)
    external onlyOwner {
    delete transferHandlerMapping[_kind];
    emit RemoveHandler(_kind, address(transferHandlerMapping[_kind]));
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