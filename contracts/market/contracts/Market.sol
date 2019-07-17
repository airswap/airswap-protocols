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

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Market: A List of Intents to Trade
  */
contract Market is Ownable {

  // Token pair of the market
  address public makerToken;
  address public takerToken;

  // Length of the list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Byte values to map to the previous and next
  byte constant private PREV = 0x00;
  byte constant private NEXT = 0x01;

  // Mapping of staker address to its neighbors
  mapping(address => mapping(byte => Intent)) list;

  /**
    * @notice Intent to Trade
    *
    * @param staker address
    * @param amount uint256
    * @param expiry uint256
    * @param locator bytes32
    */
  struct Intent {
    address staker;
    uint256 amount;
    uint256 expiry;
    bytes32 locator;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetIntent(
    address staker,
    uint256 amount,
    uint256 expiry,
    bytes32 locator,
    address makerToken,
    address takerToken
  );

  event UnsetIntent(
    address staker,
    address makerToken,
    address takerToken
  );

  /**
    * @notice Contract Constructor
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  constructor (
    address _makerToken,
    address _takerToken
  ) public {

    // Set the token pair of the market.
    makerToken = _makerToken;
    takerToken = _takerToken;

    // Initialize the list.
    Intent memory head = Intent(HEAD, 0, 0, byte(0));
    list[HEAD][PREV] = head;
    list[HEAD][NEXT] = head;
  }

  /**
    * @notice Set an Intent to Trade
    *
    * @param _staker The account
    * @param _amount uint256
    * @param _expiry uint256
    * @param _locator bytes32
    */
  function setIntent(
    address _staker,
    uint256 _amount,
    uint256 _expiry,
    bytes32 _locator
  ) external onlyOwner {
    Intent memory newIntent = Intent(_staker, _amount, _expiry, _locator);

    // Insert after the next highest amount on the list.
    if (insertIntent(newIntent, findPosition(_amount))) {
      // Increment the length of the list if successful.
      length = length + 1;

      emit SetIntent(_staker, _amount, _expiry, _locator, makerToken, takerToken);
    }
  }

  /**
    * @notice Unset an Intent to Trade
    * @param _staker address
    */
  function unsetIntent(
    address _staker
  ) public onlyOwner returns (
    bool
  ) {

    // Ensure the _staker is in the list.
    if (!hasIntent(_staker)) {
      return false;
    }

    // Link its neighbors together.
    link(list[_staker][PREV], list[_staker][NEXT]);

    // Delete staker from the list.
    delete list[_staker][PREV];
    delete list[_staker][NEXT];

    // Decrement the length of the list.
    length = length - 1;

    emit UnsetIntent(_staker, makerToken, takerToken);
    return true;
  }

  /**
    * @notice Get the Intent for a Staker
    * @param _staker address
    */
  function getIntent(
    address _staker
  ) public view returns (
    Intent memory
  ) {

    // Ensure the staker has a neighbor in the list.
    if (list[_staker][PREV].staker != address(0)) {

      // Return the next intent from the previous neighbor.
      return list[list[_staker][PREV].staker][NEXT];
    }
    return Intent(address(0), 0, 0, byte(0));
  }

  /**
    * @notice Determine Whether a Staker is in the List
    * @param _staker address
    */
  function hasIntent(
    address _staker
  ) internal view returns (
    bool
  ) {
    if (list[_staker][PREV].staker != address(0) &&
      list[list[_staker][PREV].staker][NEXT].staker == _staker) {
        return true;
    }
    return false;
  }

  /**
    * @notice Return the Length
    */
  function getLength() public view returns (uint256) {
    return length;
  }

  /**
    * @notice Get Valid Intents
    * @param _count uint256
    */
  function fetchIntents(
    uint256 _count
  ) public view returns (
    bytes32[] memory
  ) {

    // Limit results to list length or _count.
    uint256 limit = length;
    if (_count < length) {
      limit = _count;
    }
    bytes32[] memory tempResult = new bytes32[](limit);

    // Get the first intent in the list.
    Intent storage intent = list[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      if (intent.expiry >= block.timestamp) {
        tempResult[i] = intent.locator;
        i = i + 1;
      } else {
        limit = limit - 1;
      }
      intent = list[intent.staker][NEXT];
    }

    if (limit < tempResult.length) {
      bytes32[] memory result = new bytes32[](limit);
      for (i = 0; i < limit; i++) {
        result[i] = tempResult[i];
      }
      return result;
    }
    return tempResult;
  }

  /**
    * @notice Returns the first intent smaller than _amount
    * @param _amount uint256
    */
  function findPosition(
    uint256 _amount
  ) internal view returns (
    Intent memory
  ) {
    // Get the first intent in the list.
    Intent storage intent = list[HEAD][NEXT];

    if (_amount == 0) {
      // return the head of the list
      return list[intent.staker][PREV];
    }

    // Iterate through the list until a lower amount is found.
    while (_amount <= intent.amount) {
      intent = list[intent.staker][NEXT];
    }
    return intent;
  }

  /**
    * @notice Insert a new intent in the list, before the specified _nextIntent
    *
    * @param _newIntent Intent to be inserted
    * @param _nextIntent Intent to follow _newIntent
    */
  function insertIntent(
    Intent memory _newIntent,
    Intent memory _nextIntent
  ) internal returns (
    bool
  ) {

    // Ensure the _existing intent is in the list.
    if (!hasIntent(_nextIntent.staker)) {
      return false;
    }

    // Get the intent before the _nextIntent.
    Intent memory previousIntent = list[_nextIntent.staker][PREV];

    // Link the _newIntent into place.
    link(previousIntent, _newIntent);
    link(_newIntent, _nextIntent);

    return true;
  }

  /**
    * @notice Link Two Intents
    *
    * @param _left Intent
    * @param _right Intent
    */
  function link(
    Intent memory _left,
    Intent memory _right
  ) internal {
    list[_left.staker][NEXT] = _right;
    list[_right.staker][PREV] = _left;
  }

}