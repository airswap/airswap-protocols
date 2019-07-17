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

pragma solidity 0.5.10;

interface IIndexer {

  event CreateMarket(
    address makerToken,
    address takerToken
  );

  event Stake(
    address wallet,
    uint256 amount
  );

  event Unstake(
    address wallet,
    uint256 amount
  );

  event SetStakeMinimum(
    uint256 amount
  );

  event AddToBlacklist(
    address token
  );

  event RemoveFromBlacklist(
    address token
  );

  function markets(address, address) external returns (address);
  function blacklist(address) external returns (uint256);

  function createMarket(
    address _makerToken,
    address _takerToken
  ) external returns (address);

  function createTwoSidedMarket(
    address _makerToken,
    address _takerToken
  ) external returns (address, address);

  function setStakeMinimum(
    uint256 _stakeMinimum
  ) external;

  function addToBlacklist(
    address _token
  ) external;

  function removeFromBlacklist(
    address _token
  ) external;

  function setIntent(
    address _makerToken,
    address _takerToken,
    uint256 _amount,
    uint256 _expiry,
    bytes32 _locator
  ) external;

  function setTwoSidedIntent(
    address _tokenOne,
    address _tokenTwo,
    uint256 _amount,
    uint256 _expiry,
    bytes32 _locator
  ) external;

  function unsetIntent(
    address _makerToken,
    address _takerToken
  ) external;

  function unsetTwoSidedIntent(
    address _tokenOne,
    address _tokenTwo
  ) external;

  function getIntents(
    address _makerToken,
    address _takerToken,
    uint256 _count
  ) external view returns (bytes32[] memory);

  function lengthOf(
    address _makerToken,
    address _takerToken
  ) external view returns (uint256);

}
