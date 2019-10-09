pragma solidity 0.5.10;

/**
 * @title ISubKittyCore
 * @dev transferFrom function from KittyCore
 * @dev see
 */
contract ISubKittyCore {
  function transferFrom(address _from, address _to, uint256 _tokenId) external;
}