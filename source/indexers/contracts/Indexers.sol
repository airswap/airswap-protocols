// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AirSwap: Indexer URL Registry
 * @notice https://www.airswap.io/
 */
contract Indexers {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;

  EnumerableSet.AddressSet internal supportingStakers;
  mapping(address => string) public stakerURLs;

  event Stake(address indexed account);
  event Unstake(address indexed account);
  event SetURL(address indexed account, string url);

  /**
   * @notice Set the URL for a staker
   * @param _url string value of the URL
   */
  function setURL(string calldata _url) external {
    if (bytes(stakerURLs[msg.sender]).length == 0) {
      supportingStakers.add(msg.sender);
      emit Stake(msg.sender);
    }
    stakerURLs[msg.sender] = _url;
    emit SetURL(msg.sender, _url);
  }

  /**
   * @notice Return a list of all server URLs supporting a given token
   * @return urls array of server URLs supporting the token
   */
  function getURLs() external view returns (string[] memory urls) {
    uint256 length = supportingStakers.length();
    urls = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      urls[i] = stakerURLs[address(supportingStakers.at(i))];
    }
  }
}
