//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract Registry {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  mapping(address => EnumerableSet.AddressSet) internal supportedTokens;
  mapping(address => EnumerableSet.AddressSet) internal supportingStakers;
  mapping(address => bytes32) public locator;

  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
  }

  function addTokens(address[] calldata tokenList) external {
    require(tokenList.length > 0, "empty list");
    uint256 transferAmount = 0;
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount = obligationCost;
    }
    for (uint256 i = 0; i < tokenList.length; i++) {
      address token = tokenList[i];
      if (!supportedTokens[msg.sender].contains(token)) {
        transferAmount = transferAmount.add(tokenCost);
        supportedTokens[msg.sender].add(token);
        supportingStakers[token].add(msg.sender);
      }
    }
    stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
  }

  function removeTokens(address[] calldata tokenList) external {
    require(
      supportedTokens[msg.sender].length() > 0,
      "supported tokens is empty"
    );
    uint256 transferAmount = 0;
    for (uint256 i = 0; i < tokenList.length; i++) {
      address token = tokenList[i];
      if (supportedTokens[msg.sender].contains(token)) {
        transferAmount = transferAmount.add(tokenCost);
        supportedTokens[msg.sender].remove(token);
        supportingStakers[token].remove(msg.sender);
      }
    }
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount = transferAmount.add(obligationCost);
    }
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  function removeAllTokens() external {
    require(
      supportedTokens[msg.sender].length() > 0,
      "supported tokens is empty"
    );
    EnumerableSet.AddressSet storage supportedTokenList =
      supportedTokens[msg.sender];
    uint256 length = supportedTokenList.length();
    for (uint256 i = 0; i < length; i++) {
      address token = supportedTokenList.at(0);
      supportedTokenList.remove(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = obligationCost.add(tokenCost.mul(length));
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  function getSupportedTokens(address staker)
    external
    view
    returns (address[] memory tokenList)
  {
    uint256 length = supportedTokens[staker].length();
    tokenList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenList[i] = supportedTokens[staker].at(i);
    }
  }

  function getSupportingStakers(address token)
    external
    view
    returns (address[] memory stakerList)
  {
    uint256 length = supportingStakers[token].length();
    stakerList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      stakerList[i] = supportingStakers[token].at(i);
    }
  }

  function setLocator(bytes32 _locator) external {
    locator[msg.sender] = _locator;
  }

  function balanceOf(address staker) external view returns (uint256) {
    uint256 tokenCount = supportedTokens[staker].length();
    if (tokenCount == 0) {
      return 0;
    }
    return (obligationCost.add(tokenCost.mul(tokenCount)));
  }
}
