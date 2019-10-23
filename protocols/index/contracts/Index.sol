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

  // Mapping of user address to its neighbors
  mapping(address => ListElement) private linkedList;

  /**
    * @notice Locator for a Delegate
    * @dev data is arbitrary e.g. may include an address
    * @param user address
    * @param score uint256
    * @param data bytes32
    */
  struct ListElement {
    address next;
    address prev;
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
    linkedList[HEAD] = ListElement(HEAD, HEAD, 0, bytes32(0));
  }

  /**
    * @notice Set a Locator to Trade
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

    // Find the first user who has a lower stake, and insert before them
    address nextUser = findPosition(_score);

    // Link the newLocator into place.
    address prevUser = linkedList[nextUser].prev;
    
    linkedList[prevUser].next = _user;
    linkedList[nextUser].prev = _user;
    linkedList[_user] = ListElement(nextUser, prevUser, _score, _data);

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
    address prevUser = linkedList[_user].prev;
    address nextUser = linkedList[_user].next;

    linkedList[prevUser].next = nextUser;
    linkedList[nextUser].prev = prevUser;

    // Delete user from the list.
    delete linkedList[_user];

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
  ) external view returns (ListElement memory) {
    return linkedList[_user];
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

<<<<<<< HEAD
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
=======
    // Get the first user in the linked list after the HEAD
    address user = linkedList[HEAD].next;

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      result[i] = linkedList[user].data;
      i = i + 1;
      user = linkedList[user].next;
>>>>>>> draft of linked list new structure
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
    if (linkedList[_user].data != bytes32(0)) {
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
  ) internal view returns (address) {

    // Get the first user in the linked list.
    address user = linkedList[HEAD].next;

    if (_score == 0) {
      // return the head of the linked list
      return HEAD;
    }

    // Iterate through the list until a lower score is found.
    while (_score <= linkedList[user].score) {
      user = linkedList[user].next;
    }
    return user;
  }

}
