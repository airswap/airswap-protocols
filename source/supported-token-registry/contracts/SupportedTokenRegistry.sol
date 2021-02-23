//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SupportedTokenRegistry is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;

  address public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  mapping(address => EnumerableSet.AddressSet) public supportedTokens;
  mapping(address => EnumerableSet.AddressSet) public supportingStakers;
  mapping(address => bytes32) public locator;

  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost
  ) public {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
  }

  function addTokens(address[] tokenList) external {
    uint256 transferAmount = 0;
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount.add(obligationCost);
    }
    for (uint256 i = 0; i < tokenList.length; i++) {
      address token = tokenList[i];
      if (!supportedTokens[msg.sender].contains(token)) {
        transferAmount.add(tokenCost);
        supportedTokens[msg.sender].add(token);
        supportingStakers[token].add(msg.sender);
      }
    }
    stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
  }

  function removeTokens(address[] tokenList) external {
    uint256 transferAmount = 0;
    for (uint256 i = 0; i < tokenList.length; i++) {
      address token = tokenList[i];
      if (supportedTokens[msg.sender].contains(token)) {
        transferAmount.add(tokenCost);
        supportedTokens[msg.sender].remove(token);
        supportingStakers[token].remove(msg.sender);
      }
    }
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount.add(obligationCost);
    }
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  function removeAllTokens() external {
    EnumerableSet.AddressSet supportedTokenList = supportedTokens[msg.sender];
    for (uint256 i = 0; i < supportedTokenList.length(); i++) {
      address token = supportedTokenList.at(i);
      supportedTokenList.remove(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount =
      obligationCost.add(tokenCost.mul(supportedTokenList.length()));
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  function getSupportedTokens(address staker)
    external
    view
    returns (address[] tokenList)
  {
    uint256 length = supportedTokens[staker].length();
    tokenList = address[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenList[i] = supportedTokens[staker].at(i);
    }
  }

  function getSupportingStakers(address token)
    external
    view
    returns (address[] stakerList)
  {
    uint256 length = supportingStakers[token].length();
    stakerList = address[](length);
    for (uint256 i = 0; i < length; i++) {
      stakerList[i] = supportingStakers[token].at(i);
    }
  }

  function setLocator(bytes32 locator) external {
    locator[msg.sender] = locator;
  }
}
