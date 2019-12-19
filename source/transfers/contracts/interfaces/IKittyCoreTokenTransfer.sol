pragma solidity 0.5.12;

/**
 * @title IKittyCoreTokenTransfer
 * @dev transferFrom function from KittyCore
 */
contract IKittyCoreTokenTransfer {
  function transferFrom(address from, address to, uint256 tokenId) external;
}
