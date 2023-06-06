// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AirSwap: Server URL Registry
 * @notice https://www.airswap.io/
 */
contract Registry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  IERC20 public immutable stakingToken;
  uint256 public immutable stakingCost;
  uint256 public immutable supportCost;
  mapping(address => EnumerableSet.AddressSet) internal tokensByStaker;
  mapping(address => EnumerableSet.Bytes32Set) internal protocolsByStaker;
  mapping(address => EnumerableSet.AddressSet) internal stakersByToken;
  mapping(bytes4 => EnumerableSet.AddressSet) internal stakersByProtocol;
  mapping(address => string) public stakerServerURLs;

  event StakeForServer(address indexed account, string url);
  event AddProtocols(address indexed account, bytes4[] protocols);
  event AddTokens(address indexed account, address[] tokens);
  event RemoveTokens(address indexed account, address[] tokens);
  event RemoveProtocols(address indexed account, bytes4[] protocols);
  event RemoveStakedServer(
    address indexed account,
    string url,
    bytes4[] protocols,
    address[] tokens
  );

  error NoProtocolsToAdd();
  error NoProtocolsToRemove();
  error NoServerToRemove();
  error NoTokensToAdd();
  error NoTokensToRemove();
  error ProtocolDoesNotExist(bytes4);
  error ProtocolExists(bytes4);
  error TokenDoesNotExist(address);
  error TokenExists(address);
  error ServerURLInvalid();

  /**
   * @notice Constructor
   * @param _stakingToken address of token used for staking
   * @param _stakingCost base amount required to stake
   * @param _supportCost amount required per token and protocol
   */
  constructor(
    IERC20 _stakingToken,
    uint256 _stakingCost,
    uint256 _supportCost
  ) {
    stakingToken = _stakingToken;
    stakingCost = _stakingCost;
    supportCost = _supportCost;
  }

  /**
   * @notice Stake tokens and set the server URL
   * @param _url string value of the URL
   */
  function stakeForServer(string calldata _url) external {
    if (bytes(_url).length == 0) revert ServerURLInvalid();

    if (bytes(stakerServerURLs[msg.sender]).length == 0 && stakingCost > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), stakingCost);
    }
    stakerServerURLs[msg.sender] = _url;
    emit StakeForServer(msg.sender, _url);
  }

  /**
   * @notice Fully remove server URL, protocols, and tokens
   */
  function removeStakedServer() external {
    if (bytes(stakerServerURLs[msg.sender]).length == 0)
      revert NoServerToRemove();

    EnumerableSet.Bytes32Set storage supportedProtocolList = protocolsByStaker[
      msg.sender
    ];
    uint256 _protocolListLength = supportedProtocolList.length();
    bytes4[] memory _protocolList = new bytes4[](_protocolListLength);

    for (uint256 i = _protocolListLength; i > 0; ) {
      i--;
      bytes4 _protocol = bytes4(supportedProtocolList.at(i));
      _protocolList[i] = _protocol;
      supportedProtocolList.remove(_protocol);
      stakersByProtocol[_protocol].remove(msg.sender);
    }
    EnumerableSet.AddressSet storage supportedTokenList = tokensByStaker[
      msg.sender
    ];
    uint256 _tokenListLength = supportedTokenList.length();
    address[] memory _tokenList = new address[](_tokenListLength);

    for (uint256 i = _tokenListLength; i > 0; ) {
      i--;
      address _token = supportedTokenList.at(i);
      _tokenList[i] = _token;
      supportedTokenList.remove(_token);
      stakersByToken[_token].remove(msg.sender);
    }

    emit RemoveStakedServer(
      msg.sender,
      stakerServerURLs[msg.sender],
      _protocolList,
      _tokenList
    );

    stakerServerURLs[msg.sender] = "";
    uint256 _transferAmount = stakingCost +
      (supportCost * _protocolListLength) +
      (supportCost * _tokenListLength);
    if (_transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, _transferAmount);
    }
  }

  /**
   * @notice Add protocols supported by the caller
   * @param _protocols array of protocol addresses
   */
  function addProtocols(bytes4[] calldata _protocols) external {
    uint256 _length = _protocols.length;
    if (_length <= 0) revert NoProtocolsToAdd();
    EnumerableSet.Bytes32Set storage _protocolList = protocolsByStaker[
      msg.sender
    ];

    for (uint256 i = 0; i < _length; i++) {
      bytes4 protocol = _protocols[i];
      if (!_protocolList.add(protocol)) revert ProtocolExists(protocol);
      stakersByProtocol[protocol].add(msg.sender);
    }
    uint256 _transferAmount = supportCost * _length;
    emit AddProtocols(msg.sender, _protocols);
    if (_transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), _transferAmount);
    }
  }

  /**
   * @notice Remove protocols supported by the caller
   * @param _protocols array of protocol addresses
   */
  function removeProtocols(bytes4[] calldata _protocols) external {
    uint256 _length = _protocols.length;
    if (_length <= 0) revert NoProtocolsToRemove();
    EnumerableSet.Bytes32Set storage protocolList = protocolsByStaker[
      msg.sender
    ];
    for (uint256 i = 0; i < _length; i++) {
      bytes4 _protocol = _protocols[i];
      if (!protocolList.remove(_protocol))
        revert ProtocolDoesNotExist(_protocol);
      stakersByProtocol[_protocol].remove(msg.sender);
    }
    emit RemoveProtocols(msg.sender, _protocols);
  }

  /**
   * @notice Return a list of all server URLs supporting a given protocol
   * @param _protocol address of the protocol
   * @return _urls array of staker server URLs supporting the protocol
   */
  function getServerURLsForProtocol(
    bytes4 _protocol
  ) external view returns (string[] memory _urls) {
    EnumerableSet.AddressSet storage stakers = stakersByProtocol[_protocol];
    uint256 _length = stakers.length();
    _urls = new string[](_length);
    for (uint256 i = 0; i < _length; i++) {
      _urls[i] = stakerServerURLs[address(stakers.at(i))];
    }
  }

  /**
   * @notice Return whether a staker supports a given protocol
   * @param _staker account address used to stake
   * @param _protocol address of the protocol
   * @return true if the staker supports the protocol
   */
  function supportsProtocol(
    address _staker,
    bytes4 _protocol
  ) external view returns (bool) {
    return protocolsByStaker[_staker].contains(_protocol);
  }

  /**
   * @notice Return a list of all supported protocols for a given staker
   * @param _staker account address of the staker
   * @return _protocolList array of all the supported protocols
   */
  function getProtocolsForStaker(
    address _staker
  ) external view returns (bytes4[] memory _protocolList) {
    EnumerableSet.Bytes32Set storage _protocols = protocolsByStaker[_staker];
    uint256 _length = _protocols.length();
    _protocolList = new bytes4[](_length);
    for (uint256 i = 0; i < _length; i++) {
      _protocolList[i] = bytes4(_protocols.at(i));
    }
  }

  /**
   * @notice Return a list of all stakers supporting a given protocol
   * @param _protocol address of the protocol
   * @return _stakers array of all stakers that support a given protocol
   */
  function getStakersForProtocol(
    bytes4 _protocol
  ) external view returns (address[] memory _stakers) {
    EnumerableSet.AddressSet storage _stakerList = stakersByProtocol[_protocol];
    uint256 _length = _stakerList.length();
    _stakers = new address[](_length);
    for (uint256 i = 0; i < _length; i++) {
      _stakers[i] = _stakerList.at(i);
    }
  }

  /**
   * @notice Add tokens supported by the caller
   * @param _tokens array of token addresses
   */
  function addTokens(address[] calldata _tokens) external {
    uint256 _length = _tokens.length;
    if (_length <= 0) revert NoTokensToAdd();
    EnumerableSet.AddressSet storage tokenList = tokensByStaker[msg.sender];

    for (uint256 i = 0; i < _length; i++) {
      address _token = _tokens[i];
      if (!tokenList.add(_token)) revert TokenExists(_token);
      stakersByToken[_token].add(msg.sender);
    }
    uint256 _transferAmount = supportCost * _length;
    emit AddTokens(msg.sender, _tokens);
    if (_transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), _transferAmount);
    }
  }

  /**
   * @notice Remove tokens supported by the caller
   * @param _tokens array of token addresses
   */
  function removeTokens(address[] calldata _tokens) external {
    uint256 _length = _tokens.length;
    if (_length <= 0) revert NoTokensToRemove();
    EnumerableSet.AddressSet storage tokenList = tokensByStaker[msg.sender];
    for (uint256 i = 0; i < _length; i++) {
      address token = _tokens[i];
      if (!tokenList.remove(token)) revert TokenDoesNotExist(token);
      stakersByToken[token].remove(msg.sender);
    }
    uint256 _transferAmount = supportCost * _length;
    emit RemoveTokens(msg.sender, _tokens);
    if (_transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, _transferAmount);
    }
  }

  /**
   * @notice Return a list of all server URLs supporting a given token
   * @param _token address of the token
   * @return urls array of staker server URLs supporting the token
   */
  function getServerURLsForToken(
    address _token
  ) external view returns (string[] memory urls) {
    EnumerableSet.AddressSet storage stakers = stakersByToken[_token];
    uint256 _length = stakers.length();
    urls = new string[](_length);
    for (uint256 i = 0; i < _length; i++) {
      urls[i] = stakerServerURLs[address(stakers.at(i))];
    }
  }

  /**
   * @notice Return whether a staker supports a given token
   * @param _staker account address used to stake
   * @param _token address of the token
   * @return true if the staker supports the token
   */
  function supportsToken(
    address _staker,
    address _token
  ) external view returns (bool) {
    return tokensByStaker[_staker].contains(_token);
  }

  /**
   * @notice Return a list of all supported tokens for a given staker
   * @param _staker account address of the staker
   * @return tokenList array of all the supported tokens
   */
  function getTokensForStaker(
    address _staker
  ) external view returns (address[] memory tokenList) {
    EnumerableSet.AddressSet storage tokens = tokensByStaker[_staker];
    uint256 _length = tokens.length();
    tokenList = new address[](_length);
    for (uint256 i = 0; i < _length; i++) {
      tokenList[i] = tokens.at(i);
    }
  }

  /**
   * @notice Return a list of all stakers supporting a given token
   * @param _token address of the token
   * @return _stakers array of all stakers that support a given token
   */
  function getStakersForToken(
    address _token
  ) external view returns (address[] memory _stakers) {
    EnumerableSet.AddressSet storage stakerList = stakersByToken[_token];
    uint256 _length = stakerList.length();
    _stakers = new address[](_length);
    for (uint256 i = 0; i < _length; i++) {
      _stakers[i] = stakerList.at(i);
    }
  }

  /**
   * @notice Get the ServerURLs for an array of stakers
   * @param _stakers array of staker addresses
   * @return _urls array of staker ServerURLs in the same order
   */
  function getServerURLsForStakers(
    address[] calldata _stakers
  ) external view returns (string[] memory _urls) {
    uint256 stakersLength = _stakers.length;
    _urls = new string[](stakersLength);
    for (uint256 i = 0; i < stakersLength; i++) {
      _urls[i] = stakerServerURLs[_stakers[i]];
    }
  }

  /**
   * @notice Return the staking balance of a given staker
   * @param _staker address of the account used to stake
   * @return balance of the staker account
   */
  function balanceOf(address _staker) external view returns (uint256) {
    if (bytes(stakerServerURLs[_staker]).length == 0) return 0;
    uint256 _protocolCount = protocolsByStaker[_staker].length();
    uint256 _tokenCount = tokensByStaker[_staker].length();
    return
      stakingCost +
      (supportCost * _protocolCount) +
      (supportCost * _tokenCount);
  }
}
