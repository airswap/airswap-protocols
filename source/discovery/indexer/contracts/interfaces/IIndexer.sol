/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity 0.5.16;

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

  function setLocatorWhitelist(bytes2 protocol, address newLocatorWhitelist)
    external;

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

  function stakingToken() external view returns (address);

  function indexes(
    address,
    address,
    bytes2
  ) external view returns (address);

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
  )
    external
    view
    returns (
      bytes32[] memory,
      uint256[] memory,
      address
    );
}
