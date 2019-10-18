
pragma solidity 0.5.10;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TransferHandlerRegistry is Ownable {

  event AddHandler(bytes4 kind, address contractAddress);
  event RemoveHandler(bytes4 kind, address contractAddress);

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => ITransferHandler) private transferHandlerMapping;

  function addHandler(bytes4 _kind, ITransferHandler _asset)
    external onlyOwner {
    transferHandlerMapping[_kind] = _asset;
    emit AddHandler(_kind, address(_asset));
  }

  function removeHandler(bytes4 _kind)
    external onlyOwner {
    delete transferHandlerMapping[_kind];
    emit RemoveHandler(_kind, address(transferHandlerMapping[_kind]));
  }

  function getTransferHandler(bytes4 _kind) external
    view returns (ITransferHandler) {
    return transferHandlerMapping[_kind];
  }
}