// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AirSwap: Indexer URL Registry
 * @notice https://www.airswap.io/
 */
contract IndexerRegistry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  EnumerableSet.AddressSet internal supportingStakers;
  mapping(address => string) public stakerURLs;

  event Stake(address indexed account);
  event Unstake(address indexed account);
  event SetURL(address indexed account, string url);

  /**
   * @notice Constructor
   * @param _stakingToken address of token used for staking
   * @param _obligationCost base amount required to stake
   */
  constructor(IERC20 _stakingToken, uint256 _obligationCost) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
  }

  /**
   * @notice Set the URL for a staker
   * @param _url string value of the URL
   */
  function setURL(string calldata _url) external {
    if (bytes(stakerURLs[msg.sender]).length == 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), obligationCost);
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

  /**
   * @notice Return the staking balance of a given staker
   * @param staker address of the account used to stake
   * @return balance of the staker account
   */
  function balanceOf(address staker) external view returns (uint256) {
    if (bytes(stakerURLs[staker]).length == 0) {
      return 0;
    }
    return obligationCost;
  }
}
