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
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";

interface IMakerDelegate {

  event SetRule(
    address takerToken,
    address makerToken,
    uint256 maxTakerAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address takerToken,
    address makerToken
  );

  struct Rule {
    uint256 maxTakerAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  function rules(address, address) external returns (Rule memory);

  function setRule(
    address _takerToken,
    address _makerToken,
    uint256 _maxTakerAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external;

  function unsetRule(
    address _takerToken,
    address _makerToken
  ) external;

  function getMakerSideQuote(
    uint256 _takerParam,
    address _takerToken,
    address _makerToken
  ) external view returns (
    uint256 makerParam
  );

  function getTakerSideQuote(
    uint256 _makerParam,
    address _makerToken,
    address _takerToken
  ) external view returns (
    uint256 takerParam
  );

  function getMaxQuote(
    address _takerToken,
    address _makerToken
  ) external view returns (
    uint256 takerParam,
    uint256 makerParam
  );

  function provideOrder(
    Types.Order calldata _order
  ) external;

  function owner()
    external view returns (address);
}
