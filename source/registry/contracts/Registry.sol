//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

/// @title Supported Token Registry Contract
/// @author Ethan Wessel, Don Mosites, William Morriss
/// @notice Allows market makers to announce a set of tokens they can quote

contract Registry {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;

  event TokensAdded(address account, address[] tokens);
  event TokensRemoved(address account, address[] tokens);
  event LocatorSet(address account, bytes32 locator);

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  mapping(address => EnumerableSet.AddressSet) internal supportedTokens;
  mapping(address => EnumerableSet.AddressSet) internal supportingStakers;
  mapping(address => bytes32) internal locator;

  /// @notice Constructor
  /// @param _stakingToken address of the token used for obligation and token cost
  /// @param _obligationCost amount of _stakingToken a maker must stake in order
  /// to announce a set of tokens they can quote
  /// @param _tokenCost amount of _stakingToken per supported token a maker must
  /// stake when announcing a set of tokens they can quote
  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
  }

  /// @notice Adds list of supported tokens to a maker's address
  /// @param tokenList an array of token addresses a maker wants to indicate they support
  function addTokens(address[] calldata tokenList) external {
    uint256 length = tokenList.length;
    require(length > 0, "NO_TOKENS_TO_ADD");

    uint256 transferAmount = 0;
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount = obligationCost;
    }
    for (uint256 i = 0; i < length; i++) {
      address token = tokenList[i];
      require(supportedTokens[msg.sender].add(token), "TOKEN_EXISTS");
      supportingStakers[token].add(msg.sender);
    }
    transferAmount = transferAmount.add(tokenCost.mul(length));
    emit TokensAdded(msg.sender, tokenList);
    stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
  }

  /// @notice Removes list of supported tokens from a maker's address
  /// @param tokenList an array of token addresses a maker wants to indicate they no longer support
  function removeTokens(address[] calldata tokenList) external {
    uint256 length = tokenList.length;
    require(length > 0, "NO_TOKENS_TO_REMOVE");
    for (uint256 i = 0; i < length; i++) {
      address token = tokenList[i];
      require(
        supportedTokens[msg.sender].remove(token),
        "TOKEN_DOES_NOT_EXIST"
      );
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = tokenCost.mul(length);
    if (supportedTokens[msg.sender].length() == 0) {
      transferAmount = transferAmount.add(obligationCost);
    }
    emit TokensRemoved(msg.sender, tokenList);
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  /// @notice Removes all supported tokens from a maker's address
  function removeAllTokens() external {
    require(supportedTokens[msg.sender].length() > 0, "NO_TOKENS_TO_REMOVE");
    EnumerableSet.AddressSet storage supportedTokenList =
      supportedTokens[msg.sender];
    uint256 length = supportedTokenList.length();
    address[] memory tokenList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      address token = supportedTokenList.at(0);
      tokenList[i] = token;
      supportedTokenList.remove(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = obligationCost.add(tokenCost.mul(length));
    emit TokensRemoved(msg.sender, tokenList);
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  /// @notice Indicates whether a maker supports a given token
  /// @param staker the maker's address
  /// @param token the token's address
  /// @return bool true if they support a token otherwise false
  function supportsToken(address staker, address token)
    public
    view
    returns (bool)
  {
    return supportedTokens[staker].contains(token);
  }

  /// @notice Returns a list of all supported tokens for a given maker
  /// @param staker the maker's address
  /// @return tokenList an array of all the supported tokens by a maker
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

  /// @notice Returns a list of all stakers supporting a given token
  /// @param token the token address
  /// @return stakerList an array of all makers that support a given token
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

  /// @notice Sets a locator for a given maker
  /// @param _locator the locator to attach for a maker
  function setLocator(bytes32 _locator) external {
    locator[msg.sender] = _locator;
    emit LocatorSet(msg.sender, _locator);
  }

  /// @notice Gets the locators provided an array of staker addresses
  /// @param stakers an array of maker addresses
  /// @return locators an array of maker locators. Positions are relative to stakers input array
  function getLocators(address[] calldata stakers)
    external
    view
    returns (bytes32[] memory locators)
  {
    uint256 stakersLength = stakers.length;
    locators = new bytes32[](stakersLength);
    for (uint256 i = 0; i < stakersLength; i++) {
      locators[i] = locator[stakers[i]];
    }
  }

  /// @notice Returns the total amount of the staked token a maker has within the Registry
  /// @param staker the address of the maker
  /// @return uint256 the outstanding balance of all _staking token that has been staked
  function balanceOf(address staker) external view returns (uint256) {
    uint256 tokenCount = supportedTokens[staker].length();
    if (tokenCount == 0) {
      return 0;
    }
    return (obligationCost.add(tokenCost.mul(tokenCount)));
  }
}
