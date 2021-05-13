//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title AirSwap Server Registry
/// @author Ethan Wessel, Don Mosites, William Morriss
/// @notice Enables AirSwap servers to announce location and supported tokens

contract Registry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;

  event AddTokens(address account, address[] tokens);
  event RemoveTokens(address account, address[] tokens);
  event SetURL(address account, string url);

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  mapping(address => EnumerableSet.AddressSet) internal supportedTokens;
  mapping(address => EnumerableSet.AddressSet) internal supportingStakers;
  mapping(address => string) internal urls;

  /// @notice Constructor
  /// @param _stakingToken address of the token used for obligation and token cost
  /// @param _obligationCost amount of _stakingToken a server account must stake in order
  /// to announce a set of tokens it can quote
  /// @param _tokenCost amount of _stakingToken per supported token a server account must
  /// stake when announcing a set of tokens it can quote
  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
  }

  /// @notice Adds a list of tokens supported by a server account
  /// @param tokenList an array of token addresses supported by the server account
  function addTokens(address[] calldata tokenList) external {
    uint256 length = tokenList.length;
    require(length > 0, "NO_TOKENS_TO_ADD");
    EnumerableSet.AddressSet storage tokens = supportedTokens[msg.sender];

    uint256 transferAmount = 0;
    if (tokens.length() == 0) {
      transferAmount = obligationCost;
    }
    for (uint256 i = 0; i < length; i++) {
      address token = tokenList[i];
      require(tokens.add(token), "TOKEN_EXISTS");
      supportingStakers[token].add(msg.sender);
    }
    transferAmount += tokenCost * length;
    emit AddTokens(msg.sender, tokenList);
    stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
  }

  /// @notice Removes a list of tokens from those supported by a server account
  /// @param tokenList an array of token addresses no longer supported by the server account
  function removeTokens(address[] calldata tokenList) external {
    uint256 length = tokenList.length;
    require(length > 0, "NO_TOKENS_TO_REMOVE");
    EnumerableSet.AddressSet storage tokens = supportedTokens[msg.sender];
    for (uint256 i = 0; i < length; i++) {
      address token = tokenList[i];
      require(tokens.remove(token), "TOKEN_DOES_NOT_EXIST");
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = tokenCost * length;
    if (tokens.length() == 0) {
      transferAmount += obligationCost;
    }
    emit RemoveTokens(msg.sender, tokenList);
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  /// @notice Removes all tokens supported by a server account
  function removeAllTokens() external {
    EnumerableSet.AddressSet storage supportedTokenList =
      supportedTokens[msg.sender];
    uint256 length = supportedTokenList.length();
    require(length > 0, "NO_TOKENS_TO_REMOVE");
    address[] memory tokenList = new address[](length);

    for (uint256 i = length; i > 0; ) {
      i--;
      address token = supportedTokenList.at(i);
      tokenList[i] = token;
      supportedTokenList.remove(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = obligationCost + tokenCost * length;
    emit RemoveTokens(msg.sender, tokenList);
    stakingToken.safeTransfer(msg.sender, transferAmount);
  }

  /// @notice Indicates whether a server account supports a given token
  /// @param staker account used to stake for the server
  /// @param token the token address
  /// @return bool true if the server account support a token otherwise false
  function supportsToken(address staker, address token)
    external
    view
    returns (bool)
  {
    return supportedTokens[staker].contains(token);
  }

  /// @notice Returns a list of all supported tokens for a given server account
  /// @param staker account used to stake for the server
  /// @return tokenList an array of all the supported tokens
  function getSupportedTokens(address staker)
    external
    view
    returns (address[] memory tokenList)
  {
    EnumerableSet.AddressSet storage tokens = supportedTokens[staker];
    uint256 length = tokens.length();
    tokenList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenList[i] = tokens.at(i);
    }
  }

  /// @notice Returns a list of all server accounts supporting a given token
  /// @param token the token address
  /// @return stakerList an array of all server accounts that support a given token
  function getStakersForToken(address token)
    external
    view
    returns (address[] memory stakerList)
  {
    EnumerableSet.AddressSet storage stakers = supportingStakers[token];
    uint256 length = stakers.length();
    stakerList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      stakerList[i] = stakers.at(i);
    }
  }

  /// @notice Sets a URL for a server account
  /// @param _url the URL of the server account
  function setURL(string calldata _url) external {
    urls[msg.sender] = _url;
    emit SetURL(msg.sender, _url);
  }

  /// @notice Returns a list of all server URLs supporting a given token
  /// @param token the token address
  /// @return stakerList an array of all server URLs that support a given token
  function getServersForToken(address token)
    external
    view
    returns (string[] memory stakerList)
  {
    EnumerableSet.AddressSet storage stakers = supportingStakers[token];
    uint256 length = stakers.length();
    stakerList = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      stakerList[i] = urls[address(stakers.at(i))];
    }
  }

  /// @notice Gets URLs given an array of server accounts
  /// @param stakers an array of server accounts
  /// @return urlList an array of server URLs. Positions are relative to stakers input array
  function getServersForStakers(address[] calldata stakers)
    external
    view
    returns (string[] memory urlList)
  {
    uint256 stakersLength = stakers.length;
    urlList = new string[](stakersLength);
    for (uint256 i = 0; i < stakersLength; i++) {
      urlList[i] = urls[stakers[i]];
    }
  }

  /// @notice Returns the total amount of the staked token a server acccount has within the Registry
  /// @param staker account used to stake for the server
  /// @return uint256 the outstanding balance of all _staking token that has been staked
  function balanceOf(address staker) external view returns (uint256) {
    uint256 tokenCount = supportedTokens[staker].length();
    if (tokenCount == 0) {
      return 0;
    }
    return obligationCost + tokenCost * tokenCount;
  }
}
