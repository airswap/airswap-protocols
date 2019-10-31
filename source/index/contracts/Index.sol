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
  * @notice The Locators are sorted in reverse order based on the score
  * meaning that the first element in the list has the largest score
  * and final element has the smallest
  * @dev A mapping is used to mimic a circular linked list structure
  * where every mapping Entry contains a pointer to the next
  * and the previous
  */
contract Index is Ownable {

  // The number of entries in the index
  uint256 public length;

  // Identifier to use for the head of the list
  address constant internal HEAD = address(uint160(2**160-1));

  // Mapping of an identifier to its entry
  mapping(address => Entry) public entries;

  /**
    * @notice Index Entry
    * @param score uint256
    * @param locator bytes32
    * @param prev address Previous address in the linked list
    * @param next address Next address in the linked list
    */
  struct Entry {
    bytes32 locator;
    uint256 score;
    address prev;
    address next;
  }

  /**
    * @notice Contract Events
    */
  event SetLocator(
    address indexed identifier,
    uint256 score,
    bytes32 indexed locator
  );

  event UnsetLocator(
    address indexed identifier
  );

  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Create initial entry.
    entries[HEAD] = Entry(bytes32(0), 0, HEAD, HEAD);
  }

  /**
    * @notice Set a Locator
    * @param identifier address On-chain address identifying the owner of a locator
    * @param score uint256 Score for the locator being set
    * @param locator bytes32 Locator
    */
  function setLocator(
    address identifier,
    uint256 score,
    bytes32 locator
  ) external onlyOwner {

    // Ensure the entry does not already exist.
    require(!_hasEntry(identifier), "ENTRY_ALREADY_EXISTS");

    // Find the first entry with a lower score.
    address nextEntry = _getEntryLowerThan(score);

    // Link the new entry between previous and next.
    address prevEntry = entries[nextEntry].prev;
    entries[prevEntry].next = identifier;
    entries[nextEntry].prev = identifier;
    entries[identifier] = Entry(locator, score, prevEntry, nextEntry);

    // Increment the index length.
    length = length + 1;
    emit SetLocator(identifier, score, locator);
  }

  /**
    * @notice Unset a Locator
    * @param identifier address On-chain address identifying the owner of a locator
    */
  function unsetLocator(
    address identifier
  ) external onlyOwner {

    // Ensure the entry exists.
    require(_hasEntry(identifier), "ENTRY_DOES_NOT_EXIST");

    // Link the previous and next entries together.
    address prevUser = entries[identifier].prev;
    address nextUser = entries[identifier].next;
    entries[prevUser].next = nextUser;
    entries[nextUser].prev = prevUser;

    // Delete entry from the index.
    delete entries[identifier];

    // Decrement the index length.
    length = length - 1;
    emit UnsetLocator(identifier);
  }

  /**
    * @notice Get a Score
    * @param identifier address On-chain address identifying the owner of a locator
    * @return uint256 Score corresponding to the identifier
    */
  function getScore(
    address identifier
  ) external view returns (uint256) {
    return entries[identifier].score;
  }

    /**
    * @notice Get a Locator
    * @param identifier address On-chain address identifying the owner of a locator
    * @return bytes32 Locator information
    */
  function getLocator(
    address identifier
  ) external view returns (bytes32) {
    return entries[identifier].locator;
  }

  /**
    * @notice Get a Range of Locators
    * @dev start value of 0x0 starts at the head
    * @param cursor address Cursor to start with
    * @param limit uint256 Maximum number of locators to return
    * @return bytes32[] List of locators
    * @return uint256[] List of scores corresponding to locators
    * @return address The next cursor to provide for pagination
    */
  function getLocators(
    address cursor,
    uint256 limit
  ) external view returns (
    bytes32[] memory locators,
    uint256[] memory scores,
    address nextCursor
  ) {
    address identifier;

    // If a valid cursor is provided, start there.
    if (cursor != address(0) && cursor != HEAD) {
      // Check that the provided cursor exists.
      if (!_hasEntry(cursor)) {
        return (new bytes32[](0), new uint256[](0), address(0));
      }
      // Set the starting identifier to the provided cursor.
      identifier = cursor;
    } else {
      identifier = entries[HEAD].next;
    }

    // Although it's not known how many entries are between `cursor` and the end
    // We know that it is no more than `length`
    uint256 size = (length < limit) ? length : limit;

    locators = new bytes32[](size);
    scores = new uint256[](size);

    // Iterate over the list until the end or size.
    uint256 i;
    while (i < size && identifier != HEAD) {
      locators[i] = entries[identifier].locator;
      scores[i] = entries[identifier].score;
      i = i + 1;
      identifier = entries[identifier].next;
    }

    return (locators, scores, identifier);
  }

  /**
    * @notice Check if the Index has an Entry
    * @param identifier address On-chain address identifying the owner of a locator
    * @return bool True if the identifier corresponds to an Entry in the list
    */
  function _hasEntry(
    address identifier
  ) internal view returns (bool) {
    return entries[identifier].locator != bytes32(0);
  }

  /**
    * @notice Returns the largest scoring Entry Lower than a Score
    * @param score uint256 Score in question
    * @return address Identifier of the largest score lower than score
    */
  function _getEntryLowerThan(
    uint256 score
  ) internal view returns (address) {

    address identifier = entries[HEAD].next;

    // Head indicates last because the list is circular.
    if (score == 0) {
      return HEAD;
    }

    // Iterate until a lower score is found.
    while (score <= entries[identifier].score) {
      identifier = entries[identifier].next;
    }
    return identifier;
  }
}
