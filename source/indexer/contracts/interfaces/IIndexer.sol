/*
  Copyright 2019 Swap Holdings Ltd.

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

pragma solidity 0.5.12;

interface IIndexer {

  event CreateIndex(
    address signerToken,
    address senderToken
  );

  event Stake(
    address wallet,
    address signerToken,
    address senderToken,
    uint256 amount
  );

  event Unstake(
    address wallet,
    address signerToken,
    address senderToken,
    uint256 amount
  );

  event AddToBlacklist(
    address token
  );

  event RemoveFromBlacklist(
    address token
  );

  function stakingToken() external returns (address);
  function indexes(address, address) external returns (address);
  function blacklist(address) external returns (bool);

  function setLocatorWhitelist(
    address locatorWhitelist
  ) external;

  function createIndex(
    address signerToken,
    address senderToken
  ) external returns (address);

  function addToBlacklist(
    address token
  ) external;

  function removeFromBlacklist(
    address token
  ) external;

  function setIntent(
    address signerToken,
    address senderToken,
    uint256 amount,
    bytes32 locator
  ) external;

  function unsetIntent(
    address signerToken,
    address senderToken
  ) external;

  function unsetIntentForUser(
    address user,
    address signerToken,
    address senderToken
  ) external;

  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken
  ) external returns (uint256);

  function getLocators(
    address signerToken,
    address senderToken,
    address startAddress,
    uint256 count
  ) external returns (bytes32[] memory);

}
