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
  * @title Index: A List of Signals to Trade
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
  mapping(address => mapping(byte => Signal)) private signalsLinkedList;

  /**
    * @notice Signal to Trade
    *
    * @param user address
    * @param score uint256
    * @param locator bytes32
    */
  struct Signal {
    address user;
    uint256 score;
    bytes32 locator;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetSignal(
    uint256 score,
    address indexed user,
    bytes32 indexed locator
  );

  event UnsetSignal(
    address indexed user
  );

  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Initialize the linked list.
    Signal memory head = Signal(HEAD, 0, bytes32(0));
    signalsLinkedList[HEAD][PREV] = head;
    signalsLinkedList[HEAD][NEXT] = head;
  }

  /**
    * @notice Set an Signal to Trade
    *
    * @param _user The account
    * @param _score uint256
    * @param _locator bytes32
    */
  function setSignal(
    address _user,
    uint256 _score,
    bytes32 _locator
  ) external onlyOwner {

    require(!hasSignal(_user), "SIGNAL_ALREADY_SET");

    Signal memory newSignal = Signal(_user, _score, _locator);

    // Insert after the next highest score on the linked list.
    Signal memory nextSignal = findPosition(_score);

    // Link the newSignal into place.
    link(signalsLinkedList[nextSignal.user][PREV], newSignal);
    link(newSignal, nextSignal);

    // Increment the length of the linked list if successful.
    length = length + 1;

    emit SetSignal(_score, _user, _locator);
  }

  /**
    * @notice Unset an Signal to Trade
    * @param _user address
    */
  function unsetSignal(
    address _user
  ) external onlyOwner returns (bool) {

    // Ensure the _user is in the linked list.
    if (!hasSignal(_user)) {
      return false;
    }

    // Link its neighbors together.
    link(signalsLinkedList[_user][PREV], signalsLinkedList[_user][NEXT]);

    // Delete user from the list.
    delete signalsLinkedList[_user][PREV];
    delete signalsLinkedList[_user][NEXT];

    // Decrement the length of the linked list.
    length = length - 1;

    emit UnsetSignal(_user);
    return true;
  }

  /**
    * @notice Get the Signal for a user
    * @param _user address
    */
  function getSignal(
    address _user
  ) external view returns (Signal memory) {

    // Ensure the user has a neighbor in the linked list.
    if (signalsLinkedList[_user][PREV].user != address(0)) {

      // Return the next signal from the previous neighbor.
      return signalsLinkedList[signalsLinkedList[_user][PREV].user][NEXT];
    }
    return Signal(address(0), 0, bytes32(0));
  }

  /**
    * @notice Get Valid Signals
    * @param _count uint256
    */
  function fetchSignals(
    uint256 _count
  ) external view returns (bytes32[] memory result) {

    // Limit results to list length or _count.
    uint256 limit = length;
    if (_count < length) {
      limit = _count;
    }
    result = new bytes32[](limit);

    // Get the first signal in the linked list after the HEAD
    Signal storage signal = signalsLinkedList[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (i < limit) {
      result[i] = signal.locator;
      i = i + 1;
      signal = signalsLinkedList[signal.user][NEXT];
    }
  }

  /**
    * @notice Determine Whether a user is in the Linked List
    * @param _user address
    */
  function hasSignal(
    address _user
  ) internal view returns (bool) {

    if (signalsLinkedList[_user][PREV].user != address(0) &&
      signalsLinkedList[signalsLinkedList[_user][PREV].user][NEXT].user == _user) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns the first signal smaller than _score
    * @param _score uint256
    */
  function findPosition(
    uint256 _score
  ) internal view returns (Signal memory) {

    // Get the first signal in the linked list.
    Signal storage signal = signalsLinkedList[HEAD][NEXT];

    if (_score == 0) {
      // return the head of the linked list
      return signalsLinkedList[signal.user][PREV];
    }

    // Iterate through the list until a lower score is found.
    while (_score <= signal.score) {
      signal = signalsLinkedList[signal.user][NEXT];
    }
    return signal;
  }

  /**
    * @notice Link Two Signals
    *
    * @param _left Signal
    * @param _right Signal
    */
  function link(
    Signal memory _left,
    Signal memory _right
  ) internal {
    signalsLinkedList[_left.user][NEXT] = _right;
    signalsLinkedList[_right.user][PREV] = _left;
  }
}
