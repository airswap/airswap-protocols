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

/**
  * @title Structs: Library of Swap Protocol Structs
  */
library Structs {

  struct Rule {
    address senderToken;          // The address of the ERC-20 token the Delegate is sending
    address signerToken;          // The address of the ERC-20 token the Delegate is receiving
    uint256 maxSenderAmount;      // The maximum amount of ERC-20 token the delegate would send
    uint256 priceCoef;            // The whole number that will be multiplied by the 10^(-priceExp) - the price coefficient
    uint256 priceExp;             // The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
  }

  struct Intent {
    address signerToken;          // The address of the ERC-20 token to signify the token a Consumer would send
    address senderToken;          // The address of the ERC-20 token to signify the token a Consumer would receive
    uint256 amount;               // The amount to take
    bytes32 locator;              // Locator data
  }
}
