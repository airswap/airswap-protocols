
pragma solidity 0.5.10;

import "./interfaces/IAsset.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TokenRegistry is Ownable {

  event AddToRegistry(bytes4 kind, address contractAddress);
  event RemoveFromRegistry(bytes4 kind, address contractAddress);

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => IAsset) private assetMapping;

  function addToRegistry(bytes4 _kind, IAsset _asset)
    external onlyOwner {
    assetMapping[_kind] = _asset;
    emit AddToRegistry(_kind, address(_asset));
  }

  function removeFromRegistry(bytes4 _kind)
  external onlyOwner {
    delete assetMapping[_kind];
    emit RemoveFromRegistry(_kind, address(assetMapping[_kind]));
  }

  function getAsset(bytes4 _kind) external view returns (IAsset) {
    return assetMapping[_kind];
  }
}