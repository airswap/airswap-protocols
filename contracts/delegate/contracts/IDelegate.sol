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

import "@airswap/swap/contracts/ISwap.sol";

contract IDelegate {

  ISwap public swapContract;

  struct Rule {
    uint256 maxDelegateAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  function rules(address) public returns (Rule memory);

  function setSwapContract(
    address _swapContract
  ) external;

  function setRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external;

  function unsetRule(
    address delegateToken,
    address consumerToken
  ) external;

  function getBuyQuote(
    uint256 delegateAmount,
    address delegateToken,
    address consumerToken
  ) external view returns (
    bool available,
    uint256 consumerAmount
  );

  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address delegateToken
  ) external view returns (
    bool available,
    uint256 delegateAmount
  );

  function getMaxQuote(
    address delegateToken,
    address consumerToken
  ) external view returns (
    bool available,
    uint256 delegateAmount,
    uint256 consumerAmount
  );

  function provideOrder(
    uint256 nonce,
    uint256 expiry,
    address consumerWallet,
    uint256 consumerAmount,
    address consumerToken,
    address delegateWallet,
    uint256 delegateAmount,
    address delegateToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable;

  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 delegateAmount,
    address delegateToken
  ) public payable;


}
