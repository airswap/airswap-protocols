pragma solidity 0.5.12;

/**
 * @title IERC1155TransferHandler
 * @dev transferFrom function from KittyCore
 */
contract IERC1155TransferHandler {
  function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
}