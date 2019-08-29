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

  // Length of the linked list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Byte values to map to the previous and next
  byte constant private PREV = 0x00;
  byte constant private NEXT = 0x01;

  // Mapping of user address to its neighbors
  mapping(address => mapping(byte => Intent)) public intentsLinkedList;

  /**
    * @notice Intent to Trade
    *
    * @param user address
    * @param score uint256
    * @param locator bytes32
    */
  struct Intent {
    address user;
    uint256 score;
    bytes32 locator;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetIntent(
    uint256 score,
    address indexed user,
    bytes32 indexed locator
  );

  event UnsetIntent(
    address indexed user
  );

  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Initialize the linked list.
    Intent memory head = Intent(HEAD, 0, bytes32(0));
    intentsLinkedList[HEAD][PREV] = head;
    intentsLinkedList[HEAD][NEXT] = head;
  }

  /**
    * @notice Set an Intent to Trade
    *
    * @param _user The account
    * @param _score uint256
    * @param _locator bytes32
    */
  function setIntent(
    address _user,
    uint256 _score,
    bytes32 _locator
  ) external onlyOwner {

    require(!hasIntent(_user), "USER_HAS_INTENT");

    Intent memory newIntent = Intent(_user, _score, _locator);

    // Insert after the next highest score on the linked list.
    insertIntent(newIntent, findPosition(_score));
      // Increment the length of the linked list if successful.
    length = length + 1;

    emit SetIntent(_user, _score, _locator);
  }

  /**
    * @notice Unset an Intent to Trade
    * @param _user address
    */
  function unsetIntent(
    address _user
  ) external onlyOwner returns (bool) {

    // Ensure the _user is in the linked list.
    if (!hasIntent(_user)) {
      return false;
    }

    removeIntent(_user);

    emit UnsetIntent(_user);
    return true;
  }

  /**
    * @notice Get the Intent for a user
    * @param _user address
    */
  function getIntent(
    address _user
  ) external view returns (Intent memory) {

    // Ensure the user has a neighbor in the linked list.
    if (intentsLinkedList[_user][PREV].user != address(0)) {

      // Return the next intent from the previous neighbor.
      return intentsLinkedList[intentsLinkedList[_user][PREV].user][NEXT];
    }
    return Intent(address(0), 0, bytes32(0));
  }

  /**
    * @notice Get Valid Intents
    * @param _count uint256
    */
  function fetchIntents(
    uint256 _count
  ) external view returns (bytes32[] memory result) {

    // Limit results to list length or _count.
    uint256 limit = length;
    if (_count < length) {
      limit = _count;
    }
    result = new bytes32[](limit);

    // Get the first intent in the linked list after the HEAD
    Intent storage intent = intentsLinkedList[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      result[i] = intent.locator;
      i = i + 1;
      intent = intentsLinkedList[intent.user][NEXT];
    }
  }

  /**
    * @notice Determine Whether a user is in the Linked List
    * @param _user address
    */
  function hasIntent(
    address _user
  ) public view returns (bool) {

    if (intentsLinkedList[_user][PREV].user != address(0) &&
      intentsLinkedList[intentsLinkedList[_user][PREV].user][NEXT].user == _user) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns the first intent smaller than _score
    * @param _score uint256
    */
  function findPosition(
    uint256 _score
  ) internal view returns (Intent memory) {

    // Get the first intent in the linked list.
    Intent storage intent = intentsLinkedList[HEAD][NEXT];

    if (_score == 0) {
      // return the head of the linked list
      return intentsLinkedList[intent.user][PREV];
    }

    // Iterate through the list until a lower score is found.
    while (_score <= intent.score) {
      intent = intentsLinkedList[intent.user][NEXT];
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
  ) internal {

    // Get the intent before the _nextIntent.
    Intent memory previousIntent = intentsLinkedList[_nextIntent.user][PREV];

    // Link the _newIntent into place.
    link(previousIntent, _newIntent);
    link(_newIntent, _nextIntent);
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
    intentsLinkedList[_left.user][NEXT] = _right;
    intentsLinkedList[_right.user][PREV] = _left;
  }

  /**
    * @notice Removes a specified user from the linked list
    *
    * @param _user the user in question
    */
  function removeIntent(address _user) internal {
    // Link its neighbors together.
    link(intentsLinkedList[_user][PREV], intentsLinkedList[_user][NEXT]);

    // Delete user from the list.
    delete intentsLinkedList[_user][PREV];
    delete intentsLinkedList[_user][NEXT];

    // Decrement the length of the linked list.
    length = length - 1;
  }

}
