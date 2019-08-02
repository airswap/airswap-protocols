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

  // Length of the linked list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Byte values to map to the previous and next
  byte constant private PREV = 0x00;
  byte constant private NEXT = 0x01;

  // Mapping of staker address to its neighbors
  mapping(address => mapping(byte => Intent)) intentsLinkedList;

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

    // Initialize the linked list.
    Intent memory head = Intent(HEAD, 0, 0, byte(0));
    intentsLinkedList[HEAD][PREV] = head;
    intentsLinkedList[HEAD][NEXT] = head;
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

    // Insert after the next highest amount on the linked list.
    if (insertIntent(newIntent, findPosition(_amount))) {
      // Increment the length of the linked list if successful.
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
  ) public onlyOwner returns (bool) {

    // Ensure the _staker is in the linked list.
    if (!hasIntent(_staker)) {
      return false;
    }

    removeIntent(_staker);

    emit UnsetIntent(_staker, makerToken, takerToken);
    return true;
  }

  /**
    * @notice Get the Intent for a Staker
    * @param _staker address
    */
  function getIntent(
    address _staker
  ) public view returns (Intent memory) {

    // Ensure the staker has a neighbor in the linked list.
    if (intentsLinkedList[_staker][PREV].staker != address(0)) {

      // Return the next intent from the previous neighbor.
      return intentsLinkedList[intentsLinkedList[_staker][PREV].staker][NEXT];
    }
    return Intent(address(0), 0, 0, byte(0));
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
  ) public view returns (bytes32[] memory result) {

    // Limit results to list length or _count.
    uint256 limit = length;
    if (_count < length) {
      limit = _count;
    }
    result = new bytes32[](limit);

    // Get the first intent in the linked list.
    Intent storage intent = intentsLinkedList[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      if (intent.expiry >= block.timestamp) {
        result[i] = intent.locator;
        i = i + 1;
      } else {
        if (intent.staker == HEAD) {
          break;
        }
      }

      intent = intentsLinkedList[intent.staker][NEXT];
    }
  }

  /**
    * @notice Loops through _count stakers from _startingPoint and removes any expired intents
    *
    * @param _startingPoint the staker to start at
    * @param _count the number of stakers to loop through
    */
  function cleanExpiredIntents(address _startingPoint, uint256 _count) external {
    uint256 limit = _count;
    address staker = _startingPoint;
    address previousStaker;

    if (limit > length) {
      limit = length;
    }

    uint256 i = 0;
    while (i < limit) {
      if (staker != HEAD) {
        if (isIntentExpired(staker)) {
          // we must track the neighbouring intent for when `staker` is removed
          previousStaker = intentsLinkedList[staker][PREV].staker;
          removeIntent(staker);
          staker = previousStaker;
        }
        // only increase the count if it wasnt HEAD
        i++;
      }
      // now look at the next element
      staker = intentsLinkedList[staker][NEXT].staker;
    }
  }

  /**
    * @notice Concludes whether a staker's intent has expired
    *
    * @param _staker the staker in question
    * @return bool has the staker's intent expired?
    */
  function isIntentExpired(address _staker) public returns (bool) {
    return getIntent(_staker).expiry <= now;
  }

  /**
    * @notice Determine Whether a Staker is in the Linked List
    * @param _staker address
    */
  function hasIntent(
    address _staker
  ) public view returns (bool) {

    if (intentsLinkedList[_staker][PREV].staker != address(0) &&
      intentsLinkedList[intentsLinkedList[_staker][PREV].staker][NEXT].staker == _staker) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns the first intent smaller than _amount
    * @param _amount uint256
    */
  function findPosition(
    uint256 _amount
  ) internal view returns (Intent memory) {

    // Get the first intent in the linked list.
    Intent storage intent = intentsLinkedList[HEAD][NEXT];

    if (_amount == 0) {
      // return the head of the linked list
      return intentsLinkedList[intent.staker][PREV];
    }

    // Iterate through the list until a lower amount is found.
    while (_amount <= intent.amount) {
      intent = intentsLinkedList[intent.staker][NEXT];
    }
    return intent;
  }

  /**
    * @notice Insert a new intent in the linked list, before the specified _nextIntent
    *
    * @param _newIntent Intent to be inserted
    * @param _nextIntent Intent to follow _newIntent
    */
  function insertIntent(
    Intent memory _newIntent,
    Intent memory _nextIntent
  ) internal returns (bool) {

    // Ensure the _existing intent is in the linked list.
    if (!hasIntent(_nextIntent.staker)) {
      return false;
    }

    // Get the intent before the _nextIntent.
    Intent memory previousIntent = intentsLinkedList[_nextIntent.staker][PREV];

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
    intentsLinkedList[_left.staker][NEXT] = _right;
    intentsLinkedList[_right.staker][PREV] = _left;
  }

  /**
    * @notice Removes a specified staker from the linked list
    *
    * @param _staker the staker in question
    */
  function removeIntent(address _staker) internal {
    // Link its neighbors together.
    link(intentsLinkedList[_staker][PREV], intentsLinkedList[_staker][NEXT]);

    // Delete staker from the list.
    delete intentsLinkedList[_staker][PREV];
    delete intentsLinkedList[_staker][NEXT];

    // Decrement the length of the linked list.
    length = length - 1;
  }

}