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

  // Number of entries in the index
  uint256 public length;

  // Identifier to use for the head
  address private constant HEAD = address(uint160(2**160-1));

  // Mapping of identifier to its entry
  mapping(address => Entry) private _entries;

  /**
    * @notice Index Entry
    * @param score uint256
    * @param locator bytes32
    * @param prev address
    * @param next address
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
    * @param _identifier address
    * @param _score uint256
    * @param _locator bytes32
    */
  function setLocator(
    address _identifier,
    uint256 _score,
    bytes32 _locator
  ) external onlyOwner {

    // Ensure the entry does not already exist.
    require(!hasEntry(_identifier), "ENTRY_ALREADY_EXISTS");

    // Find the first entry with a lower score.
    address nextEntry = getEntryLowerThan(_score);

    // Link the new entry between previous and next.
    address prevEntry = _entries[nextEntry].prev;
    _entries[prevEntry].next = _identifier;
    _entries[nextEntry].prev = _identifier;
    _entries[_identifier] = Entry(_locator, _score, prevEntry, nextEntry);

    // Increment the index length.
    length = length + 1;
    emit SetLocator(_identifier, _score, _locator);
  }

  /**
    * @notice Unset a Locator
    * @param _identifier address
    * @return bool return true on success
    */
  function unsetLocator(
    address _identifier
  ) external onlyOwner returns (bool) {

    // Ensure the entry exists.
    require(hasEntry(_identifier), "ENTRY_DOES_NOT_EXIST");

    // Link the previous and next entries together.
    address prevUser = _entries[_identifier].prev;
    address nextUser = _entries[_identifier].next;
    _entries[prevUser].next = nextUser;
    _entries[nextUser].prev = prevUser;

    // Delete entry from the index.
    delete _entries[_identifier];

    // Decrement the index length.
    length = length - 1;

    emit UnsetLocator(_identifier);
    return true;
  }

  /**
    * @notice Get a Score
    * @param _identifier address
    * @return (uint256, bytes32) score and locator
    */
  function getScore(
    address _identifier
  ) external view returns (uint256) {
    return _entries[_identifier].score;
  }

  /**
    * @notice Get a Range of Locators
    * @dev _start value of 0x0 starts at the head
    * @param _start address The identifier to start
    * @param _count uint256 The number to return
    * @return result bytes32[]
    */
  function getLocators(
    address _start,
    uint256 _count
  ) external view returns (bytes32[] memory result) {

    address identifier = _entries[HEAD].next;

    // If a valid _start is provided, start there.
    if (_start != address(0) && _start != HEAD) {
      // Check that the provided _start identifier exists.
      require(hasEntry(_start), 'START_ENTRY_NOT_FOUND');
      // Set the identifier to the provided _start.
      identifier = _start;
    }

    result = new bytes32[](_count);

    // Iterate over the list until the end or count.
    uint8 i = 0;
    while (i < _count && identifier != HEAD) {
      result[i] = _entries[identifier].locator;
      i = i + 1;
      identifier = _entries[identifier].next;
    }
  }

  /**
    * @notice Check if the Index has an Entry
    * @param _identifier address
    * @return bool
    */
  function hasEntry(
    address _identifier
  ) internal view returns (bool) {
    if (_entries[_identifier].locator != bytes32(0)) {
      return true;
    }
    return false;
  }

  /**
    * @notice Returns an Entry Lower than a Score
    * @param _score uint256
    * @return address
    */
  function getEntryLowerThan(
    uint256 _score
  ) internal view returns (address) {

    address identifier = _entries[HEAD].next;

    // Head indicates last because the list is circular.
    if (_score == 0) {
      return HEAD;
    }

    // Iterate until a lower score is found.
    while (_score <= _entries[identifier].score) {
      identifier = _entries[identifier].next;
    }
    return identifier;
  }

}
