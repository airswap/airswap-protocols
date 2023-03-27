// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AirSwap: Server Registry
 * @notice https://www.airswap.io/
 */
contract MakerRegistry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable tokenCost;
  mapping(address => EnumerableSet.AddressSet) internal tokensByServer;
  mapping(address => EnumerableSet.Bytes32Set) internal protocolsByServer;
  mapping(address => EnumerableSet.AddressSet) internal serversByToken;
  mapping(bytes4 => EnumerableSet.AddressSet) internal serversByProtocol;
  mapping(address => string) public serverURLs;

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
   * @param _tokenCost amount required to stake per protocol
   */
  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _tokenCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
    tokenCost = _tokenCost;
  }

  /**
   * @notice Set the URL for a server
   * @param _url string value of the URL
   */
  function setURL(string calldata _url) external {
    serverURLs[msg.sender] = _url;
    emit SetURL(msg.sender, _url);
  }

  /**
   * @notice Add tokens supported by the caller
   * @param tokens array of token addresses
   */
  function addTokens(address[] calldata tokens) external {
    uint256 length = tokens.length;
    if (length <= 0) revert NoTokensToAdd();
    EnumerableSet.AddressSet storage tokenList = tokensByServer[msg.sender];

    uint256 transferAmount = 0;
    if (tokenList.length() == 0) {
      transferAmount = obligationCost;
      emit InitialStake(msg.sender);
    }
    for (uint256 i = 0; i < length; i++) {
      address token = tokens[i];
      if (!tokenList.add(token)) revert TokenExists(token);
      serversByToken[token].add(msg.sender);
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
    EnumerableSet.AddressSet storage tokenList = tokensByServer[msg.sender];
    for (uint256 i = 0; i < length; i++) {
      address token = tokens[i];
      if (!tokenList.remove(token)) revert TokenDoesNotExist(token);
      serversByToken[token].remove(msg.sender);
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
    EnumerableSet.AddressSet storage supportedTokenList = tokensByServer[
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
      serversByToken[token].remove(msg.sender);
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
    EnumerableSet.AddressSet storage servers = serversByToken[token];
    uint256 length = servers.length();
    urls = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      urls[i] = serverURLs[address(servers.at(i))];
    }
  }

  /**
   * @notice Return whether a server supports a given token
   * @param server account address used to stake
   * @param token address of the token
   * @return true if the server supports the token
   */
  function supportsToken(
    address server,
    address token
  ) external view returns (bool) {
    return tokensByServer[server].contains(token);
  }

  /**
   * @notice Return a list of all supported tokens for a given server
   * @param server account address of the server
   * @return tokenList array of all the supported tokens
   */
  function getTokensForServer(
    address server
  ) external view returns (address[] memory tokenList) {
    EnumerableSet.AddressSet storage tokens = tokensByServer[server];
    uint256 length = tokens.length();
    tokenList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenList[i] = tokens.at(i);
    }
  }

  /**
   * @notice Return a list of all servers supporting a given token
   * @param token address of the token
   * @return servers array of all servers that support a given token
   */
  function getServersForToken(
    address token
  ) external view returns (address[] memory servers) {
    EnumerableSet.AddressSet storage serverList = serversByToken[token];
    uint256 length = serverList.length();
    servers = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      servers[i] = serverList.at(i);
    }
  }

  /**
   * @notice Add protocols supported by the caller
   * @param protocols array of protocol addresses
   */
  function addProtocols(bytes4[] calldata protocols) external {
    uint256 length = protocols.length;
    if (length <= 0) revert NoProtocolsToAdd();
    EnumerableSet.Bytes32Set storage protocolList = protocolsByServer[
      msg.sender
    ];

    for (uint256 i = 0; i < length; i++) {
      bytes4 protocol = protocols[i];
      if (!protocolList.add(protocol)) revert ProtocolExists(protocol);
      serversByProtocol[protocol].add(msg.sender);
    }
    emit AddProtocols(msg.sender, protocols);
  }

  /**
   * @notice Remove protocols supported by the caller
   * @param protocols array of protocol addresses
   */
  function removeProtocols(bytes4[] calldata protocols) external {
    uint256 length = protocols.length;
    if (length <= 0) revert NoProtocolsToRemove();
    EnumerableSet.Bytes32Set storage protocolList = protocolsByServer[
      msg.sender
    ];
    for (uint256 i = 0; i < length; i++) {
      bytes4 protocol = protocols[i];
      if (!protocolList.remove(protocol)) revert ProtocolDoesNotExist(protocol);
      serversByProtocol[protocol].remove(msg.sender);
    }
    emit RemoveProtocols(msg.sender, protocols);
  }

  /**
   * @notice Remove all protocols supported by the caller
   */
  function removeAllProtocols() external {
    EnumerableSet.Bytes32Set storage supportedProtocolList = protocolsByServer[
      msg.sender
    ];
    uint256 length = supportedProtocolList.length();
    if (length <= 0) revert NoProtocolsToRemove();
    bytes4[] memory protocolList = new bytes4[](length);

    for (uint256 i = length; i > 0; ) {
      i--;
      bytes4 protocol = bytes4(supportedProtocolList.at(i));
      protocolList[i] = protocol;
      supportedProtocolList.remove(protocol);
      serversByProtocol[protocol].remove(msg.sender);
    }
    emit RemoveProtocols(msg.sender, protocolList);
  }

  /**
   * @notice Return a list of all server URLs supporting a given protocol
   * @param protocol address of the protocol
   * @return urls array of server URLs supporting the protocol
   */
  function getURLsForProtocol(
    bytes4 protocol
  ) external view returns (string[] memory urls) {
    EnumerableSet.AddressSet storage servers = serversByProtocol[protocol];
    uint256 length = servers.length();
    urls = new string[](length);
    for (uint256 i = 0; i < length; i++) {
      urls[i] = serverURLs[address(servers.at(i))];
    }
  }

  /**
   * @notice Get the URLs for an array of servers
   * @param servers array of server addresses
   * @return urls array of server URLs in the same order
   */
  function getURLsForServers(
    address[] calldata servers
  ) external view returns (string[] memory urls) {
    uint256 serversLength = servers.length;
    urls = new string[](serversLength);
    for (uint256 i = 0; i < serversLength; i++) {
      urls[i] = serverURLs[servers[i]];
    }
  }

  /**
   * @notice Return whether a server supports a given protocol
   * @param server account address used to stake
   * @param protocol address of the protocol
   * @return true if the server supports the protocol
   */
  function supportsProtocol(
    address server,
    bytes4 protocol
  ) external view returns (bool) {
    return protocolsByServer[server].contains(protocol);
  }

  /**
   * @notice Return a list of all supported protocols for a given server
   * @param server account address of the server
   * @return protocolList array of all the supported protocols
   */
  function getProtocolsForServer(
    address server
  ) external view returns (bytes4[] memory protocolList) {
    EnumerableSet.Bytes32Set storage protocols = protocolsByServer[server];
    uint256 length = protocols.length();
    protocolList = new bytes4[](length);
    for (uint256 i = 0; i < length; i++) {
      protocolList[i] = bytes4(protocols.at(i));
    }
  }

  /**
   * @notice Return a list of all servers supporting a given protocol
   * @param protocol address of the protocol
   * @return servers array of all servers that support a given protocol
   */
  function getServersForProtocol(
    bytes4 protocol
  ) external view returns (address[] memory servers) {
    EnumerableSet.AddressSet storage serverList = serversByProtocol[protocol];
    uint256 length = serverList.length();
    servers = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      servers[i] = serverList.at(i);
    }
  }

  /**
   * @notice Return the staking balance of a given server
   * @param server address of the account used to stake
   * @return balance of the server account
   */
  function balanceOf(address server) external view returns (uint256) {
    uint256 tokenCount = tokensByServer[server].length();
    if (tokenCount == 0) {
      return 0;
    }
    return obligationCost + tokenCost * tokenCount;
  }
}
