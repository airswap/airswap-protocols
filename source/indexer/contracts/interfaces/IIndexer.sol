// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IIndexer {
  event CreateIndex(
    address indexed signerToken,
    address indexed senderToken,
    bytes2 protocol,
    address indexAddress
  );

  event Stake(
    address indexed staker,
    address indexed signerToken,
    address indexed senderToken,
    bytes2 protocol,
    uint256 stakeAmount
  );

  event Unstake(
    address indexed staker,
    address indexed signerToken,
    address indexed senderToken,
    bytes2 protocol,
    uint256 stakeAmount
  );

  event AddTokenToBlacklist(address token);

  event RemoveTokenFromBlacklist(address token);

  function setLocatorWhitelist(
    bytes2 protocol,
    address newLocatorWhitelist
  ) external;

  function createIndex(
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) external returns (address);

  function addTokenToBlacklist(address token) external;

  function removeTokenFromBlacklist(address token) external;

  function setIntent(
    address signerToken,
    address senderToken,
    bytes2 protocol,
    uint256 stakingAmount,
    bytes32 locator
  ) external;

  function unsetIntent(
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) external;

  function getStakingToken() external view returns (address);

  function tokenBlacklist(address) external view returns (bool);

  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) external view returns (uint256);

  function getLocators(
    address signerToken,
    address senderToken,
    bytes2 protocol,
    address cursor,
    uint256 limit
  ) external view returns (bytes32[] memory, uint256[] memory, address);
}
