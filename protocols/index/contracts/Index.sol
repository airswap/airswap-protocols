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

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Index: A List of Entries
  */
contract Index is Ownable {

  // Length of the linked list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Mapping of user address to its neighbors
  mapping(address => Entry) private listEntry;

  /**
    * @notice Entry for a locator
    * @dev locator is arbitrary e.g. may include an address
    * @param user address
    * @param score uint256
    * @param locator bytes32
    */
  struct Entry {
    address prev;
    address next;
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
    listEntry[HEAD] = Entry(HEAD, HEAD, 0, bytes32(0));
  }

  /**
    * @notice Set a Entry to Trade
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

    require(!hasEntry(_user), "ENTRY_ALREADY_EXISTS");

    // Find the first user who has a lower stake, and insert before them
    address nextUser = findPosition(_score);

    // Link the newUser into place.
    address prevUser = listEntry[nextUser].prev;

    listEntry[prevUser].next = _user;
    listEntry[nextUser].prev = _user;
    listEntry[_user] = Entry(prevUser, nextUser, _score, _locator);

    // Increment the length of the linked list if successful.
    length = length + 1;

    emit SetEntry(_score, _user, _locator);
  }

  /**
    * @notice Unset an Entry to Trade
    * @param _user address
    * @return bool return true on success
    */
  function unsetEntry(
    address _user
  ) external onlyOwner returns (bool) {

    // Ensure the _user is in the linked list.
    if (!hasEntry(_user)) {
      return false;
    }

    // Link its neighbors together.
    address prevUser = listEntry[_user].prev;
    address nextUser = listEntry[_user].next;

    listEntry[prevUser].next = nextUser;
    listEntry[nextUser].prev = prevUser;

    // Delete user from the list.
    delete listEntry[_user];

    // Decrement the length of the linked list.
    length = length - 1;

    emit UnsetEntry(_user);
    return true;
  }

  /**
    * @notice Get the Entry information for a user
    * @param _user address
    * @return (uint256, bytes32) score and locator
    */
  function getEntry(
    address _user
  ) external view returns (uint256, bytes32) {
    return (listEntry[_user].score, listEntry[_user].locator);
  }

  /**
    * @notice Get Valid Locators
    * @dev if _startUser is provided as 0x0, the function starts from the head of the list
    * @param _startUser address The user to start from
    * @param _count uint256 The number of locators to return
    * @return result bytes32[]
    */
  function fetchEntries(
    address _startUser,
    uint256 _count
  ) external view returns (bytes32[] memory result) {

    // locator starts holding the first locator to consider
    Locator storage locator = locatorsLinkedList[HEAD][NEXT];

    // if there's a valid start user, start there instead of the head
    if (_startUser != address(0) && _startUser != HEAD) {
      // the locator of the start user
      locator = locatorsLinkedList[locatorsLinkedList[_startUser][PREV].user][NEXT];

      // check the start user actually features in the linked list
      require(locator.user == _startUser, 'USER_HAS_NO_LOCATOR');
    }

    // Get the first user in the linked list after the HEAD
    address user = listEntry[HEAD].next;

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      result[i] = listEntry[user].locator;
      i = i + 1;
      user = listEntry[user].next;
    }
  }

  /**
    * @notice Determine Whether a user is in the Linked List
    * @param _user address
    * @return bool return true when user exists
    */
  function hasEntry(
    address _user
  ) internal view returns (bool) {
    if (listEntry[_user].locator != bytes32(0)) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns the first user who staked less than _score
    * @param _score uint256
    * @return address of the user
    */
  function findPosition(
    uint256 _score
  ) internal view returns (address) {

    // Get the first user in the linked list.
    address user = listEntry[HEAD].next;

    if (_score == 0) {
      // return the head of the linked list
      return HEAD;
    }

    // Iterate through the list until a lower score is found.
    while (_score <= listEntry[user].score) {
      user = listEntry[user].next;
    }
    return user;
  }

}
