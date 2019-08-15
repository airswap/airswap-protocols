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

interface IPeer {

  event SetRule(
    address peerToken,
    address consumerToken,
    uint256 maxPeerAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address peerToken,
    address consumerToken
  );

  struct Rule {
    uint256 maxPeerAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  function rules(address, address) external returns (Rule memory);

  function setRule(
    address _peerToken,
    address _consumerToken,
    uint256 _maxPeerAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external;

  function unsetRule(
    address _peerToken,
    address _consumerToken
  ) external;

  function getBuyQuote(
    uint256 _peerAmount,
    address _peerToken,
    address _consumerToken
  ) external returns (
    uint256 consumerAmount
  );

  function getSellQuote(
    uint256 _consumerAmount,
    address _consumerToken,
    address _peerToken
  ) external returns (
    uint256 peerAmount
  );

  function getMaxQuote(
    address _peerToken,
    address _consumerToken
  ) external returns (
    uint256 peerAmount,
    uint256 consumerAmount
  );

  function provideOrder(
    uint256 _nonce,
    uint256 _expiry,
    address _consumerWallet,
    uint256 _consumerAmount,
    address _consumerToken,
    address _peerWallet,
    uint256 _peerAmount,
    address _peerToken,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  function provideUnsignedOrder(
    uint256 _nonce,
    uint256 _consumerAmount,
    address _consumerToken,
    uint256 _peerAmount,
    address _peerToken
  ) external;
}
