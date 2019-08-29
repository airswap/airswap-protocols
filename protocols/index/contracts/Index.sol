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
  * @title Index: A List of Entries to Trade
  */
contract Index is Ownable {

  // Length of the linked list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Byte values to map to the previous and next
  byte constant private PREV = 0x00;
  byte constant private NEXT = 0x01;

  // Mapping of user address to its neighbors
  mapping(address => mapping(byte => Entry)) public entriesLinkedList;

  /**
    * @notice Entry to Trade
    *
    * @param user address
    * @param score uint256
    * @param locator bytes32
    */
  struct Entry {
    address user;
    uint256 score;
    bytes32 locator;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetEntry(
    uint256 score,
    address indexed user,
    bytes32 indexed locator
  );

  event UnsetEntry(
    address indexed user
  );

  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Initialize the linked list.
    Entry memory head = Entry(HEAD, 0, bytes32(0));
    entriesLinkedList[HEAD][PREV] = head;
    entriesLinkedList[HEAD][NEXT] = head;
  }

  /**
    * @notice Set an Entry to Trade
    *
    * @param _user The account
    * @param _score uint256
    * @param _locator bytes32
    */
  function setEntry(
    address _user,
    uint256 _score,
    bytes32 _locator
  ) external onlyOwner {

    require(!hasEntry(_user), "USER_HAS_ENTRY");

    Entry memory newEntry = Entry(_user, _score, _locator);

    // Insert after the next highest score on the linked list.
    Entry memory nextEntry = findPosition(_score);

    // Link the newEntry into place.
    link(entriesLinkedList[nextEntry.user][PREV], newEntry);
    link(newEntry, nextEntry);

    // Increment the length of the linked list if successful.
    length = length + 1;

    emit SetEntry(_score, _user, _locator);
  }

  /**
    * @notice Unset an Entry to Trade
    * @param _user address
    */
  function unsetEntry(
    address _user
  ) external onlyOwner returns (bool) {

    // Ensure the _user is in the linked list.
    if (!hasEntry(_user)) {
      return false;
    }

    // Link its neighbors together.
    link(entriesLinkedList[_user][PREV], entriesLinkedList[_user][NEXT]);

    // Delete user from the list.
    delete entriesLinkedList[_user][PREV];
    delete entriesLinkedList[_user][NEXT];

    // Decrement the length of the linked list.
    length = length - 1;

    emit UnsetEntry(_user);
    return true;
  }

  /**
    * @notice Get the Entry for a user
    * @param _user address
    */
  function getEntry(
    address _user
  ) external view returns (Entry memory) {

    // Ensure the user has a neighbor in the linked list.
    if (entriesLinkedList[_user][PREV].user != address(0)) {

      // Return the next intent from the previous neighbor.
      return entriesLinkedList[entriesLinkedList[_user][PREV].user][NEXT];
    }
    return Entry(address(0), 0, bytes32(0));
  }

  /**
    * @notice Get Valid Entries
    * @param _count uint256
    */
  function fetchEntries(
    uint256 _count
  ) external view returns (bytes32[] memory result) {

    // Limit results to list length or _count.
    uint256 limit = length;
    if (_count < length) {
      limit = _count;
    }
    result = new bytes32[](limit);

    // Get the first intent in the linked list after the HEAD
    Entry storage intent = entriesLinkedList[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      result[i] = intent.locator;
      i = i + 1;
      intent = entriesLinkedList[intent.user][NEXT];
    }
  }

  /**
    * @notice Determine Whether a user is in the Linked List
    * @param _user address
    */
  function hasEntry(
    address _user
  ) public view returns (bool) {

    if (entriesLinkedList[_user][PREV].user != address(0) &&
      entriesLinkedList[entriesLinkedList[_user][PREV].user][NEXT].user == _user) {
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
  ) internal view returns (Entry memory) {

    // Get the first intent in the linked list.
    Entry storage intent = entriesLinkedList[HEAD][NEXT];

    if (_score == 0) {
      // return the head of the linked list
      return entriesLinkedList[intent.user][PREV];
    }

    // Iterate through the list until a lower score is found.
    while (_score <= intent.score) {
      intent = entriesLinkedList[intent.user][NEXT];
    }
    return intent;
  }

  /**
    * @notice Link Two Entries
    *
    * @param _left Entry
    * @param _right Entry
    */
  function link(
    Entry memory _left,
    Entry memory _right
  ) internal {
    entriesLinkedList[_left.user][NEXT] = _right;
    entriesLinkedList[_right.user][PREV] = _left;
  }
}
