pragma solidity 0.5.10;

/**
 * @title IPartialKittyCoreTransferHandler
 * @dev transferFrom function from KittyCore
 */
contract IPartialKittyCoreTransferHandler {
  function transferFrom(address _from, address _to, uint256 _tokenId) external;
}
