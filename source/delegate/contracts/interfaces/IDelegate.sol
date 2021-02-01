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
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";

interface IDelegate {
  struct Rule {
    uint256 maxSenderAmount; // The maximum amount of ERC-20 token the delegate would send
    uint256 priceCoef; // Number to be multiplied by 10^(-priceExp) - the price coefficient
    uint256 priceExp; // Indicates location of the decimal priceCoef * 10^(-priceExp)
  }

  event SetRule(
    address indexed owner,
    address indexed senderToken,
    address indexed signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address indexed owner,
    address indexed senderToken,
    address indexed signerToken
  );

  event ProvideOrder(
    address indexed owner,
    address tradeWallet,
    address indexed senderToken,
    address indexed signerToken,
    uint256 senderAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  function setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external;

  function unsetRule(address senderToken, address signerToken) external;

  function provideOrder(Types.Order calldata order) external;

  function rules(address, address) external view returns (Rule memory);

  function getSignerSideQuote(
    uint256 senderAmount,
    address senderToken,
    address signerToken
  ) external view returns (uint256 signerAmount);

  function getSenderSideQuote(
    uint256 signerAmount,
    address signerToken,
    address senderToken
  ) external view returns (uint256 senderAmount);

  function getMaxQuote(address senderToken, address signerToken)
    external
    view
    returns (uint256 senderAmount, uint256 signerAmount);

  function owner() external view returns (address);

  function tradeWallet() external view returns (address);
}
