pragma solidity 0.5.10;

import "./interfaces/IAsset.sol";

contract TokenRegistry {

  address owner;
  event AddToRegistry(bytes4 kind, address contractAddress);
  event RemoveFromRegistry(bytes4 kind, address contractAddress);

  // Mapping of bytes4 to contract interface type
  mapping (bytes4 => IAsset) private assetMapping;

  constructor() public {
    owner = msg.sender;
  }

  function addToRegistry(bytes4 _kind, IAsset _asset) external {
    require(msg.sender == owner, "NOT OWNER");
    assetMapping[_kind] = _asset;
    emit AddToRegistry(_kind, address(_asset));
  }

  function removeFromRegistry(bytes4 _kind) external {
    require(msg.sender == owner, "NOT OWNER");
    delete assetMapping[_kind];
    emit RemoveFromRegistry(_kind, address(assetMapping[_kind]));
  }

  function getAsset(bytes4 _kind) external view returns (IAsset) {
    return assetMapping[_kind];
  }
}