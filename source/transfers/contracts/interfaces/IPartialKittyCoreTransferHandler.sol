pragma solidity 0.5.12;

/**
 * @title IPartialKittyCoreTransferHandler
 * @dev transferFrom function from KittyCore
 */
contract IPartialKittyCoreTransferHandler {
  function transferFrom(address from, address to, uint256 tokenId) external;
}
