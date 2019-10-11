pragma solidity 0.5.10;

/**
 * @title IPartialKittyCoreAsset
 * @dev transferFrom function from KittyCore
 */
contract IPartialKittyCoreAsset {
  function transferFrom(address _from, address _to, uint256 _tokenId) external;
}
