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
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";

interface IDelegate {

  event SetRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address senderToken,
    address signerToken
  );

  function rules(address, address) external returns (Types.Rule memory);

  function setRule(
    address _senderToken,
    address _signerToken,
    Types.Rule calldata _rule
  ) external;

  function unsetRule(
    address _senderToken,
    address _signerToken
  ) external;

  function getSignerSideQuote(
    uint256 _senderParam,
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 signerParam
  );

  function getSenderSideQuote(
    uint256 _signerParam,
    address _signerToken,
    address _senderToken
  ) external view returns (
    uint256 senderParam
  );

  function getMaxQuote(
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 senderParam,
    uint256 signerParam
  );

  function provideOrder(
    Types.Order calldata _order
  ) external;

  function owner()
    external view returns (address);

  function tradeWallet()
    external view returns (address);

}
