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
  * @title Index: A List of Locators
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
  mapping(address => mapping(byte => Locator)) private locatorsLinkedList;

  /**
    * @notice Locator for a Delegate
    * @dev data is arbitrary e.g. may include an address
    * @param user address
    * @param score uint256
    * @param data bytes32
    */
  struct Locator {
    address user;
    uint256 score;
    bytes32 data;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetLocator(
    uint256 score,
    address indexed user,
    bytes32 indexed data
  );

  event UnsetLocator(
    address indexed user
  );

  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Initialize the linked list.
    Locator memory head = Locator(HEAD, 0, bytes32(0));
    locatorsLinkedList[HEAD][PREV] = head;
    locatorsLinkedList[HEAD][NEXT] = head;
  }

  /**
    * @notice Set an Locator to Trade
    *
    * @param _user The account
    * @param _score uint256
    * @param _data bytes32
    */
  function setLocator(
    address _user,
    uint256 _score,
    bytes32 _data
  ) external onlyOwner {

    require(!hasLocator(_user), "LOCATOR_ALREADY_SET");

    Locator memory newLocator = Locator(_user, _score, _data);

    // Insert after the next highest score on the linked list.
    Locator memory nextLocator = findPosition(_score);

    // Link the newLocator into place.
    link(locatorsLinkedList[nextLocator.user][PREV], newLocator);
    link(newLocator, nextLocator);

    // Increment the length of the linked list if successful.
    length = length + 1;

    emit SetLocator(_score, _user, _data);
  }

  /**
    * @notice Unset an Locator to Trade
    * @param _user address
    * @return bool return true on success
    */
  function unsetLocator(
    address _user
  ) external onlyOwner returns (bool) {

    // Ensure the _user is in the linked list.
    if (!hasLocator(_user)) {
      return false;
    }

    // Link its neighbors together.
    link(locatorsLinkedList[_user][PREV], locatorsLinkedList[_user][NEXT]);

    // Delete user from the list.
    delete locatorsLinkedList[_user][PREV];
    delete locatorsLinkedList[_user][NEXT];

    // Decrement the length of the linked list.
    length = length - 1;

    emit UnsetLocator(_user);
    return true;
  }

  /**
    * @notice Get the Locator for a user
    * @param _user address
    * @return Locator
    */
  function getLocator(
    address _user
  ) external view returns (Locator memory) {

    // Ensure the user has a neighbor in the linked list.
    if (locatorsLinkedList[_user][PREV].user != address(0)) {

      // Return the next Locator from the previous neighbor.
      return locatorsLinkedList[locatorsLinkedList[_user][PREV].user][NEXT];
    }
    return Locator(address(0), 0, bytes32(0));
  }

  /**
    * @notice Get Valid Locators
    * @dev if _startUser is provided as 0x0, the function starts from the head of the list
    * @param _startUser address The user to start from
    * @param _count uint256 The number of locators to return
    * @return result bytes32[]
    */
  function fetchLocators(
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

    result = new bytes32[](_count);

    // Iterate over the list until the end or limit.
    uint256 i = 0;

    // if the HEAD is reached (the end of the list) before count, break
    while (i < _count && locator.user != HEAD) {
      // add the locator to the returned data
      result[i] = locator.data;
      i = i + 1;

      // move along to the next locator
      locator = locatorsLinkedList[locator.user][NEXT];
    }
  }

  /**
    * @notice Determine Whether a user is in the Linked List
    * @param _user address
    * @return bool return true when user exists
    */
  function hasLocator(
    address _user
  ) internal view returns (bool) {

    if (locatorsLinkedList[_user][PREV].user != address(0) &&
      locatorsLinkedList[locatorsLinkedList[_user][PREV].user][NEXT].user == _user) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns the first Locator smaller than _score
    * @param _score uint256
    * @return Locator
    */
  function findPosition(
    uint256 _score
  ) internal view returns (Locator memory) {

    // Get the first Locator in the linked list.
    Locator storage locator = locatorsLinkedList[HEAD][NEXT];

    if (_score == 0) {
      // return the head of the linked list
      return locatorsLinkedList[locator.user][PREV];
    }

    // Iterate through the list until a lower score is found.
    while (_score <= locator.score) {
      locator = locatorsLinkedList[locator.user][NEXT];
    }
    return locator;
  }

  /**
    * @notice Link Two Locators
    * @dev helper function for linked list
    * @param _left Locator
    * @param _right Locator
    */
  function link(
    Locator memory _left,
    Locator memory _right
  ) internal {
    locatorsLinkedList[_left.user][NEXT] = _right;
    locatorsLinkedList[_right.user][PREV] = _left;
  }
}
