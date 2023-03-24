// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AirSwap: Maker Registry
 * @notice https://www.airswap.io/
 */
contract MakerRegistry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  uint256 public immutable protocolCost;
  mapping(address => EnumerableSet.AddressSet) internal supportedTokens;
  mapping(address => EnumerableSet.Bytes32Set) internal supportedProtocols;
  mapping(address => EnumerableSet.AddressSet) internal supportingStakers;
  mapping(address => string) public stakerURLs;

  event InitialStake(address indexed account);
  event FullUnstake(address indexed account);
  event AddTokens(address indexed account, address[] tokens);
  event RemoveTokens(address indexed account, address[] tokens);
  event AddProtocols(address indexed account, bytes4[] protocols);
  event RemoveProtocols(address indexed account, bytes4[] protocols);
  event SetURL(address indexed account, string url);

  error NoProtocolsToAdd();
  error NoProtocolsToRemove();
  error ProtocolDoesNotExist(bytes4);
  error ProtocolExists(bytes4);
  error NoTokensToAdd();
  error NoTokensToRemove();
  error TokenDoesNotExist(address);
  error TokenExists(address);

  /**
   * @notice Constructor
   * @param _stakingToken address of token used for staking
   * @param _obligationCost base amount required to stake
   * @param _protocolCost amount required to stake per protocol
   */
  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost,
    uint256 _protocolCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
    protocolCost = _protocolCost;
  }

  /**
   * @notice Set the URL for a staker
   * @param _url string value of the URL
   */
  function setURL(string calldata _url) external {
    stakerURLs[msg.sender] = _url;
    emit SetURL(msg.sender, _url);
  }

  /**
   * @notice Add tokens supported by the caller
   * @param tokens array of token addresses
   */
  function addTokens(address[] calldata tokens) external {
    uint256 length = tokens.length;
    if (length <= 0) revert NoTokensToAdd();
    EnumerableSet.AddressSet storage tokenList = supportedTokens[msg.sender];

    uint256 transferAmount = 0;
    if (tokenList.length() == 0) {
      transferAmount = obligationCost;
      emit InitialStake(msg.sender);
    }
    for (uint256 i = 0; i < length; i++) {
      address token = tokens[i];
      if (!tokenList.add(token)) revert TokenExists(token);
      supportingStakers[token].add(msg.sender);
    }
    transferAmount += tokenCost * length;
    emit AddTokens(msg.sender, tokens);
    if (transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
    }
  }

  /**
   * @notice Remove tokens supported by the caller
   * @param tokens array of token addresses
   */
  function removeTokens(address[] calldata tokens) external {
    uint256 length = tokens.length;
    if (length <= 0) revert NoTokensToRemove();
    EnumerableSet.AddressSet storage tokenList = supportedTokens[msg.sender];
    for (uint256 i = 0; i < length; i++) {
      address token = tokens[i];
      if (!tokenList.remove(token)) revert TokenDoesNotExist(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = tokenCost * length;
    if (tokenList.length() == 0) {
      transferAmount += obligationCost;
      emit FullUnstake(msg.sender);
    }
    emit RemoveTokens(msg.sender, tokens);
    if (transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, transferAmount);
    }
  }

  /**
   * @notice Remove all tokens supported by the caller
   */
  function removeAllTokens() external {
    EnumerableSet.AddressSet storage supportedTokenList = supportedTokens[
      msg.sender
    ];
    uint256 length = supportedTokenList.length();
    if (length <= 0) revert NoTokensToRemove();
    address[] memory tokenList = new address[](length);

    for (uint256 i = length; i > 0; ) {
      i--;
      address token = supportedTokenList.at(i);
      tokenList[i] = token;
      supportedTokenList.remove(token);
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = obligationCost + tokenCost * length;
    emit FullUnstake(msg.sender);
    emit RemoveTokens(msg.sender, tokenList);
    if (transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, transferAmount);
    }
  }

  /**
   * @notice Return a list of all server URLs supporting a given token
   * @param token address of the token
   * @return urls array of server URLs supporting the token
   */
  function getURLsForToken(
    address token
  ) external view returns (string[] memory urls) {
    EnumerableSet.AddressSet storage stakers = supportingStakers[token];
    uint256 length = stakers.length();
    urls = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      urls[i] = stakerURLs[address(stakers.at(i))];
    }
  }

  /**
   * @notice Return whether a staker supports a given token
   * @param staker account address used to stake
   * @param token address of the token
   * @return true if the staker supports the token
   */
  function supportsToken(
    address staker,
    address token
  ) external view returns (bool) {
    return supportedTokens[staker].contains(token);
  }

  /**
   * @notice Return a list of all supported tokens for a given staker
   * @param staker account address of the staker
   * @return tokenList array of all the supported tokens
   */
  function getSupportedTokens(
    address staker
  ) external view returns (address[] memory tokenList) {
    EnumerableSet.AddressSet storage tokens = supportedTokens[staker];
    uint256 length = tokens.length();
    tokenList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenList[i] = tokens.at(i);
    }
  }

  /**
   * @notice Return a list of all stakers supporting a given token
   * @param token address of the token
   * @return stakers array of all stakers that support a given token
   */
  function getStakersForToken(
    address token
  ) external view returns (address[] memory stakers) {
    EnumerableSet.AddressSet storage stakerList = supportingStakers[token];
    uint256 length = stakerList.length();
    stakers = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      stakers[i] = stakerList.at(i);
    }
  }

  /**
   * @notice Add protocols supported by the caller
   * @param protocols array of protocol addresses
   */
  function addProtocols(bytes4[] calldata protocols) external {
    uint256 length = protocols.length;
    if (length <= 0) revert NoProtocolsToAdd();
    EnumerableSet.Bytes32Set storage protocolList = supportedProtocols[
      msg.sender
    ];

    uint256 transferAmount = 0;
    if (protocolList.length() == 0) {
      transferAmount = obligationCost;
      emit InitialStake(msg.sender);
    }
    for (uint256 i = 0; i < length; i++) {
      bytes4 protocol = protocols[i];
      if (!protocolList.add(protocol)) revert ProtocolExists(protocol);
    }
    transferAmount += protocolCost * length;
    emit AddProtocols(msg.sender, protocols);
    if (transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), transferAmount);
    }
  }

  /**
   * @notice Remove protocols supported by the caller
   * @param protocols array of protocol addresses
   */
  function removeProtocols(bytes4[] calldata protocols) external {
    uint256 length = protocols.length;
    if (length <= 0) revert NoProtocolsToRemove();
    EnumerableSet.Bytes32Set storage protocolList = supportedProtocols[
      msg.sender
    ];
    for (uint256 i = 0; i < length; i++) {
      bytes4 protocol = protocols[i];
      if (!protocolList.remove(protocol)) revert ProtocolDoesNotExist(protocol);
    }
    uint256 transferAmount = protocolCost * length;
    if (protocolList.length() == 0) {
      transferAmount += obligationCost;
      emit FullUnstake(msg.sender);
    }
    emit RemoveProtocols(msg.sender, protocols);
    if (transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, transferAmount);
    }
  }

  /**
   * @notice Remove all protocols supported by the caller
   */
  function removeAllProtocols() external {
    EnumerableSet.Bytes32Set storage supportedProtocolList = supportedProtocols[
      msg.sender
    ];
    uint256 length = supportedProtocolList.length();
    if (length <= 0) revert NoProtocolsToRemove();
    bytes4[] memory protocolList = new bytes4[](length);

    for (uint256 i = length; i > 0; ) {
      i--;
      bytes4 protocol = supportedProtocolList.at(i)[4];
      protocolList[i] = protocol;
      supportedProtocolList.remove(protocol);
    }
    uint256 transferAmount = obligationCost + protocolCost * length;
    emit FullUnstake(msg.sender);
    emit RemoveProtocols(msg.sender, protocolList);
    if (transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, transferAmount);
    }
  }

  /**
   * @notice Return a list of all server URLs supporting a given protocol
   * @param protocol address of the protocol
   * @return urls array of server URLs supporting the protocol
   */
  function getURLsForProtocol(
    address protocol
  ) external view returns (string[] memory urls) {
    EnumerableSet.AddressSet storage stakers = supportingStakers[protocol];
    uint256 length = stakers.length();
    urls = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      urls[i] = stakerURLs[address(stakers.at(i))];
    }
  }

  /**
   * @notice Get the URLs for an array of stakers
   * @param stakers array of staker addresses
   * @return urls array of server URLs in the same order
   */
  function getURLsForStakers(
    address[] calldata stakers
  ) external view returns (string[] memory urls) {
    uint256 stakersLength = stakers.length;
    urls = new string[](stakersLength);
    for (uint256 i = 0; i < stakersLength; i++) {
      urls[i] = stakerURLs[stakers[i]];
    }
  }

  /**
   * @notice Return whether a staker supports a given protocol
   * @param staker account address used to stake
   * @param protocol address of the protocol
   * @return true if the staker supports the protocol
   */
  function supportsProtocol(
    address staker,
    bytes4 protocol
  ) external view returns (bool) {
    return supportedProtocols[staker].contains(protocol);
  }

  /**
   * @notice Return a list of all supported protocols for a given staker
   * @param staker account address of the staker
   * @return protocolList array of all the supported protocols
   */
  function getSupportedProtocols(
    address staker
  ) external view returns (bytes4[] memory protocolList) {
    EnumerableSet.Bytes32Set storage protocols = supportedProtocols[staker];
    uint256 length = protocols.length();
    protocolList = new bytes4[](length);
    for (uint256 i = 0; i < length; i++) {
      protocolList[i] = protocols.at(i)[4];
    }
  }

  /**
   * @notice Return a list of all stakers supporting a given protocol
   * @param protocol address of the protocol
   * @return stakers array of all stakers that support a given protocol
   */
  function getStakersForProtocol(
    address protocol
  ) external view returns (address[] memory stakers) {
    EnumerableSet.AddressSet storage stakerList = supportingStakers[protocol];
    uint256 length = stakerList.length();
    stakers = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      stakers[i] = stakerList.at(i);
    }
  }

  /**
   * @notice Return the staking balance of a given staker
   * @param staker address of the account used to stake
   * @return balance of the staker account
   */
  function balanceOf(address staker) external view returns (uint256) {
    uint256 tokenCount = supportedTokens[staker].length();
    if (tokenCount == 0) {
      return 0;
    }
    return obligationCost + tokenCost * tokenCount;
  }
}
