// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

/**
 * @title IKittyCoreTokenTransfer
 * @dev transferFrom function from KittyCore
 */
interface IKittyCoreTokenTransfer {
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external returns (bool);
}
