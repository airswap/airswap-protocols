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

  function stakeToken() external returns (address);
  function indexes(address, address) external returns (address);
  function blacklist(address) external returns (bool);

  function createIndex(
    address _signerToken,
    address _senderToken
  ) external returns (address);

  function addToBlacklist(
    address _token
  ) external;

  function removeFromBlacklist(
    address _token
  ) external;

  function setIntent(
    address _signerToken,
    address _senderToken,
    uint256 _amount,
    bytes32 _locator
  ) external;

  function unsetIntent(
    address _signerToken,
    address _senderToken
  ) external;

  function getScore(
    address _signerToken,
    address _senderToken,
    address _user
  ) external view returns (uint256);

  function getIntents(
    address _signerToken,
    address _senderToken,
    uint256 _count
  ) external view returns (bytes32[] memory);

}
