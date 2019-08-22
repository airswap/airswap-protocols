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

interface IPeer {

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

  function getBuyQuote(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken
  ) external returns (
    uint256 makerAmount
  );

  function getSellQuote(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken
  ) external returns (
    uint256 takerAmount
  );

  function getMaxQuote(
    address _takerToken,
    address _makerToken
  ) external returns (
    uint256 takerAmount,
    uint256 makerAmount
  );

  function provideOrder(
    Types.Order calldata order,
    Types.Signature calldata signature
  ) external;

  function provideUnsignedOrder(
    uint256 _nonce,
    uint256 _makerAmount,
    address _makerToken,
    uint256 _takerAmount,
    address _takerToken
  ) external;
}
