pragma solidity 0.5.12;

import "./Flattened.sol";

contract EchidnaIndexer is Indexer {
  constructor() public Indexer(address(1)){
  }

  function echidna_stakingToken() public view returns(bool) {
    return address(stakingToken) == address(1);
  }

  function echidna_createIndex() public returns(bool) {
    address index = this.createIndex(address(0), address(1));
    return address(index) != address(0);
  }

  function echidna_getLocators() public returns(bool) {
    this.createIndex(address(0), address(1));
    //a created index should not have any locators
    (bytes32[] memory locators, uint256[] memory scores, address cursor) = this.getLocators(address(0), address(1), address(0), 3);
    return locators.length == 0 && scores.length == 0;
  }

  function echidna_setIntent() public returns(bool) {
    //ensure whitelist is 0x0
    locatorWhitelist = address(0);

    this.createIndex(address(0), address(1));

    //ensure tokens are not on blacklist
    tokenBlacklist[address(0)] = false;
    tokenBlacklist[address(1)] = false;

    this.setIntent(address(0), address(1), 0, bytes32("5"));
    (bytes32[] memory locators, uint256[] memory scores, address cursor) = this.getLocators(address(0), address(1), address(0), 3);
    return locators.length == 1 && scores.length == 1;
  }

  function echidna_unsetIntent() public returns(bool) {
    //ensure whitelist is 0x0
    locatorWhitelist = address(0);

    this.createIndex(address(0), address(1));

    //ensure tokens are not on blacklist
    tokenBlacklist[address(0)] = false;
    tokenBlacklist[address(1)] = false;

    this.setIntent(address(0), address(1), 0, bytes32("5"));

    this.unsetIntent(address(0), address(1));
    (bytes32[] memory locators, uint256[] memory scores, address cursor) = this.getLocators(address(0), address(1), address(0), 3);
    return locators.length == 0 && scores.length == 0;
  }

  function echidna_getStakedAmount() public returns(bool) {
    //ensure whitelist is 0x0
    locatorWhitelist = address(0);

    this.createIndex(address(0), address(1));

    //ensure tokens are not on blacklist
    tokenBlacklist[address(0)] = false;
    tokenBlacklist[address(1)] = false;

    this.setIntent(address(0), address(1), 0, bytes32("5"));
    uint256 amount = this.getStakedAmount(msg.sender, address(0), address(1));

    return amount == 0;
  }
}

contract EchidnaIndex is Index {
  function echidna_getScore() public returns(bool) {
    uint256 score = 100;
    // Find the first entry with a lower score.
    address nextEntry = _getEntryLowerThan(score);

    // Link the new entry between previous and next.
    address identifier = address(1);
    address prevEntry = entries[nextEntry].prev;
    entries[prevEntry].next = identifier;
    entries[nextEntry].prev = identifier;
    entries[identifier] = Entry("bamb", score, prevEntry, nextEntry);

    // Increment the index length.
    length = length + 1;

    entries[address(1)].score = 100;
    uint256 val = this.getScore(address(1));
    return val == 100;
  }
}
