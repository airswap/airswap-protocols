// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface ILocatorWhitelist {
  function has(bytes32 locator) external view returns (bool);
}
