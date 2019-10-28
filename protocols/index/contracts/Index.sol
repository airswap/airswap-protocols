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

  // The number of entries in the index
  uint256 public length;

  // Identifier to use for the head of the list
  address private constant HEAD = address(uint160(2**160-1));

  // Mapping of an identifier to its entry
  mapping(address => Entry) private _entries;

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
    _entries[HEAD] = Entry(bytes32(0), 0, HEAD, HEAD);
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
    require(!hasEntry(identifier), "ENTRY_ALREADY_EXISTS");

    // Find the first entry with a lower score.
    address nextEntry = getEntryLowerThan(score);

    // Link the new entry between previous and next.
    address prevEntry = _entries[nextEntry].prev;
    _entries[prevEntry].next = identifier;
    _entries[nextEntry].prev = identifier;
    _entries[identifier] = Entry(locator, score, prevEntry, nextEntry);

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
    require(hasEntry(identifier), "ENTRY_DOES_NOT_EXIST");

    // Link the previous and next entries together.
    address prevUser = _entries[identifier].prev;
    address nextUser = _entries[identifier].next;
    _entries[prevUser].next = nextUser;
    _entries[nextUser].prev = prevUser;

    // Delete entry from the index.
    delete _entries[identifier];

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
    return _entries[identifier].score;
  }

  /**
    * @notice Get a Range of Locators
    * @dev start value of 0x0 starts at the head
    * @param start address Identifier to start with
    * @param count uint256 Number of locators to return
    * @return bytes32[] result List of locators
    */
  function getLocators(
    address start,
    uint256 count
  ) external view returns (bytes32[] memory result) {

    address identifier = _entries[HEAD].next;

    // If a valid start is provided, start there.
    if (start != address(0) && start != HEAD) {
      // Check that the provided start identifier exists.
      require(hasEntry(start), "START_ENTRY_NOT_FOUND");
      // Set the identifier to the provided start.
      identifier = start;
    }

    result = new bytes32[](count);

    // Iterate over the list until the end or count.
    uint8 i = 0;
    while (i < count && identifier != HEAD) {
      result[i] = _entries[identifier].locator;
      i = i + 1;
      identifier = _entries[identifier].next;
    }
  }

  /**
    * @notice Check if the Index has an Entry
    * @param identifier address On-chain address identifying the owner of a locator
    * @return bool True if the identifier corresponds to an Entry in the list
    */
  function hasEntry(
    address identifier
  ) internal view returns (bool) {
    return _entries[identifier].locator != bytes32(0);
  }

  /**
    * @notice Returns the largest scoring Entry Lower than a Score
    * @param score uint256 Score in question
    * @return address Identifier of the largest score lower than score
    */
  function getEntryLowerThan(
    uint256 score
  ) internal view returns (address) {

    address identifier = _entries[HEAD].next;

    // Head indicates last because the list is circular.
    if (score == 0) {
      return HEAD;
    }

    // Iterate until a lower score is found.
    while (score <= _entries[identifier].score) {
      identifier = _entries[identifier].next;
    }
    return identifier;
  }
}
