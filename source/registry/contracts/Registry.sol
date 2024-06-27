// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IRegistry.sol";

/**
 * @title AirSwap: Server Registry
 * @notice https://www.airswap.io/
 */
contract Registry is IRegistry {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  IERC20 public immutable stakingToken;
  uint256 public immutable stakingCost;
  uint256 public immutable supportCost;

  mapping(address => string) public stakerServerURLs;
  mapping(address => EnumerableSet.Bytes32Set) internal protocolsByStaker;
  mapping(bytes4 => EnumerableSet.AddressSet) internal stakersByProtocol;
  mapping(address => EnumerableSet.AddressSet) internal tokensByStaker;
  mapping(address => EnumerableSet.AddressSet) internal stakersByToken;

  /**
   * @notice Registry constructor
   * @param _stakingToken IERC20 address of token used for staking
   * @param _stakingCost uint256 base amount required to stake
   * @param _supportCost uint256 amount required per token or protocol
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
   * @notice Set a server URL
   * @param _url string URL
   */
  function setServerURL(string calldata _url) external {
    if (bytes(_url).length == 0) revert ServerURLInvalid();
    if (bytes(stakerServerURLs[msg.sender]).length == 0 && stakingCost > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), stakingCost);
    }
    stakerServerURLs[msg.sender] = _url;
    emit SetServerURL(msg.sender, _url);
  }

  /**
   * @notice Unset server URL, all protocols, and all tokens
   */
  function unsetServer() external {
    if (bytes(stakerServerURLs[msg.sender]).length == 0)
      revert NoServerURLSet();

    EnumerableSet.Bytes32Set storage supportedProtocolList = protocolsByStaker[
      msg.sender
    ];
    uint256 _protocolListLength = supportedProtocolList.length();

    bytes4[] memory _protocolList = new bytes4[](_protocolListLength);

    for (uint256 i = _protocolListLength; i > 0; ) {
      unchecked {
        --i;
      }
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
      unchecked {
        --i;
      }
      address _token = supportedTokenList.at(i);
      _tokenList[i] = _token;
      supportedTokenList.remove(_token);
      stakersByToken[_token].remove(msg.sender);
    }

    string memory _url = stakerServerURLs[msg.sender];

    delete stakerServerURLs[msg.sender];

    uint256 _transferAmount = stakingCost +
      (supportCost * _protocolListLength) +
      (supportCost * _tokenListLength);
    if (_transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, _transferAmount);
    }

    emit UnsetServer(msg.sender, _url, _protocolList, _tokenList);
  }

  /**
   * @notice Add protocols supported by the staker
   * @param _protocols bytes4[] protocol identifiers
   */
  function addProtocols(bytes4[] calldata _protocols) external {
    uint256 _length = _protocols.length;
    if (_length <= 0) revert ArgumentInvalid();
    EnumerableSet.Bytes32Set storage _protocolList = protocolsByStaker[
      msg.sender
    ];

    for (uint256 i; i < _length; ) {
      bytes4 protocol = _protocols[i];
      if (!_protocolList.add(protocol)) revert ProtocolExists(protocol);
      stakersByProtocol[protocol].add(msg.sender);
      unchecked {
        ++i;
      }
    }

    uint256 _transferAmount = supportCost * _length;
    if (_transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), _transferAmount);
    }

    emit AddProtocols(msg.sender, _protocols);
  }

  /**
   * @notice Remove protocols supported by the staker
   * @param _protocols bytes4[] protocol identifiers
   */
  function removeProtocols(bytes4[] calldata _protocols) external {
    uint256 _length = _protocols.length;
    if (_length <= 0) revert ArgumentInvalid();
    EnumerableSet.Bytes32Set storage protocolList = protocolsByStaker[
      msg.sender
    ];
    for (uint256 i; i < _length; ) {
      bytes4 _protocol = _protocols[i];
      if (!protocolList.remove(_protocol))
        revert ProtocolDoesNotExist(_protocol);
      stakersByProtocol[_protocol].remove(msg.sender);
      unchecked {
        ++i;
      }
    }

    uint256 _transferAmount = supportCost * _length;
    emit RemoveProtocols(msg.sender, _protocols);

    if (_transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, _transferAmount);
    }
  }

  /**
   * @notice Get all server URLs that support a protocol
   * @param _protocol bytes4 protocol identifier
   * @return _urls string[] URLs that support the protocol
   */
  function getServerURLsForProtocol(
    bytes4 _protocol
  ) external view returns (string[] memory _urls) {
    EnumerableSet.AddressSet storage stakers = stakersByProtocol[_protocol];
    uint256 _length = stakers.length();
    _urls = new string[](_length);
    for (uint256 i; i < _length; ) {
      _urls[i] = stakerServerURLs[address(stakers.at(i))];
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Return whether a staker supports a protocol
   * @param _staker address staker address
   * @param _protocol bytes4 protocol identifier
   * @return bool true if the staker supports the protocol
   */
  function supportsProtocol(
    address _staker,
    bytes4 _protocol
  ) external view returns (bool) {
    return protocolsByStaker[_staker].contains(_protocol);
  }

  /**
   * @notice Get all supported protocols for a staker
   * @param _staker address staker address
   * @return _protocolList bytes4[] supported protocol identifiers
   */
  function getProtocolsForStaker(
    address _staker
  ) external view returns (bytes4[] memory _protocolList) {
    EnumerableSet.Bytes32Set storage _protocols = protocolsByStaker[_staker];
    uint256 _length = _protocols.length();
    _protocolList = new bytes4[](_length);
    for (uint256 i; i < _length; ) {
      _protocolList[i] = bytes4(_protocols.at(i));
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Get all stakers that support a protocol
   * @param _protocol bytes4 protocol identifier
   * @return _stakers address[] stakers that support the protocol
   */
  function getStakersForProtocol(
    bytes4 _protocol
  ) external view returns (address[] memory _stakers) {
    EnumerableSet.AddressSet storage _stakerList = stakersByProtocol[_protocol];
    uint256 _length = _stakerList.length();
    _stakers = new address[](_length);
    for (uint256 i; i < _length; ) {
      _stakers[i] = _stakerList.at(i);
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Add tokens supported by the staker
   * @param _tokens address[] token addresses
   */
  function addTokens(address[] calldata _tokens) external {
    uint256 _length = _tokens.length;
    if (_length <= 0) revert ArgumentInvalid();
    EnumerableSet.AddressSet storage tokenList = tokensByStaker[msg.sender];

    for (uint256 i; i < _length; ) {
      address _token = _tokens[i];
      if (!tokenList.add(_token)) revert TokenExists(_token);
      stakersByToken[_token].add(msg.sender);
      unchecked {
        ++i;
      }
    }
    uint256 _transferAmount = supportCost * _length;
    emit AddTokens(msg.sender, _tokens);
    if (_transferAmount > 0) {
      stakingToken.safeTransferFrom(msg.sender, address(this), _transferAmount);
    }
  }

  /**
   * @notice Remove tokens supported by the staker
   * @param _tokens address[] token addresses
   */
  function removeTokens(address[] calldata _tokens) external {
    uint256 _length = _tokens.length;
    if (_length <= 0) revert ArgumentInvalid();
    EnumerableSet.AddressSet storage tokenList = tokensByStaker[msg.sender];
    for (uint256 i; i < _length; ) {
      address token = _tokens[i];
      if (!tokenList.remove(token)) revert TokenDoesNotExist(token);
      stakersByToken[token].remove(msg.sender);
      unchecked {
        ++i;
      }
    }
    uint256 _transferAmount = supportCost * _length;
    emit RemoveTokens(msg.sender, _tokens);
    if (_transferAmount > 0) {
      stakingToken.safeTransfer(msg.sender, _transferAmount);
    }
  }

  /**
   * @notice Get all server URLs that support a token
   * @param _token address of a token
   * @return urls array of URLs that support the token
   */
  function getServerURLsForToken(
    address _token
  ) external view returns (string[] memory urls) {
    EnumerableSet.AddressSet storage stakers = stakersByToken[_token];
    uint256 _length = stakers.length();
    urls = new string[](_length);
    for (uint256 i; i < _length; ) {
      urls[i] = stakerServerURLs[address(stakers.at(i))];
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Return whether a staker supports a token
   * @param _staker address staker address
   * @param _token address token address
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
   * @param _staker address staker address
   * @return tokenList address[] supported tokens
   */
  function getTokensForStaker(
    address _staker
  ) external view returns (address[] memory tokenList) {
    EnumerableSet.AddressSet storage tokens = tokensByStaker[_staker];
    uint256 _length = tokens.length();
    tokenList = new address[](_length);
    for (uint256 i; i < _length; ) {
      tokenList[i] = tokens.at(i);
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Get all stakers that support a token
   * @param _token address token address
   * @return _stakers address[] stakers that support the token
   */
  function getStakersForToken(
    address _token
  ) external view returns (address[] memory _stakers) {
    EnumerableSet.AddressSet storage stakerList = stakersByToken[_token];
    uint256 _length = stakerList.length();
    _stakers = new address[](_length);
    for (uint256 i; i < _length; ) {
      _stakers[i] = stakerList.at(i);
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Get the URLs for an array of stakers
   * @param _stakers address[] staker addresses
   * @return _urls string[] staker URLs mapped to _stakers
   */
  function getServerURLsForStakers(
    address[] calldata _stakers
  ) external view returns (string[] memory _urls) {
    uint256 stakersLength = _stakers.length;
    _urls = new string[](stakersLength);
    for (uint256 i; i < stakersLength; ) {
      _urls[i] = stakerServerURLs[_stakers[i]];
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Get the staking balance of a staker
   * @param _staker address staker address
   * @return balance uint256 balance of the staker address
   */
  function balanceOf(address _staker) external view returns (uint256) {
    uint256 _stakingBalance;
    if (bytes(stakerServerURLs[_staker]).length > 0)
      _stakingBalance = stakingCost;
    uint256 _protocolCount = protocolsByStaker[_staker].length();
    uint256 _tokenCount = tokensByStaker[_staker].length();
    return
      _stakingBalance +
      (supportCost * _protocolCount) +
      (supportCost * _tokenCount);
  }
}
