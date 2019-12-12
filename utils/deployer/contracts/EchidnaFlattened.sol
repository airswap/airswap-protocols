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
}
