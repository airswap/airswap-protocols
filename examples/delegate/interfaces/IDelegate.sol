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

interface IDelegate {

  event SetRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address delegateToken,
    address consumerToken
  );

  struct Rule {
    uint256 maxDelegateAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  function rules(address, address) external returns (Rule memory);

  function setSwapContract(
    address swapContract
  ) external;

  function setRule(
    address _delegateToken,
    address _consumerToken,
    uint256 _maxDelegateAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external;

  function unsetRule(
    address _delegateToken,
    address _consumerToken
  ) external;

  function getBuyQuote(
    uint256 _delegateAmount,
    address _delegateToken,
    address _consumerToken
  ) external returns (
    uint256 consumerAmount
  );

  function getSellQuote(
    uint256 _consumerAmount,
    address _consumerToken,
    address _delegateToken
  ) external returns (
    uint256 delegateAmount
  );

  function getMaxQuote(
    address _delegateToken,
    address _consumerToken
  ) external returns (
    uint256 delegateAmount,
    uint256 consumerAmount
  );

  function provideOrder(
    uint256 _nonce,
    uint256 _expiry,
    address _consumerWallet,
    uint256 _consumerAmount,
    address _consumerToken,
    address _delegateWallet,
    uint256 _delegateAmount,
    address _delegateToken,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external payable;

  function provideUnsignedOrder(
    uint256 _nonce,
    uint256 _consumerAmount,
    address _consumerToken,
    uint256 _delegateAmount,
    address _delegateToken
  ) external payable;
}
