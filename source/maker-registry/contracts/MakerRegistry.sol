// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

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

  IERC20 public immutable stakingToken;
  uint256 public immutable obligationCost;
  uint256 public immutable protocolCost;
  mapping(address => EnumerableSet.AddressSet) internal supportedProtocols;
  mapping(address => EnumerableSet.AddressSet) internal supportingStakers;
  mapping(address => string) public stakerURLs;

  event InitialStake(address indexed account);
  event FullUnstake(address indexed account);
  event AddProtocols(address indexed account, address[] tokens);
  event RemoveProtocols(address indexed account, address[] tokens);
  event SetURL(address indexed account, string url);

  /**
   * @notice Constructor
   * @param _stakingToken address of token used for staking
   * @param _obligationCost base amount required to stake
   * @param _protocolCost amount required to stake per token
   */
  constructor(
    IERC20 _stakingToken,
    uint256 _obligationCost,
    uint256 _protocolCost
  ) {
    stakingToken = _stakingToken;
    obligationCost = _obligationCost;
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
   * @notice Add protocols supported by the caller
   * @param protocols array of protocol addresses
   */
  function addProtocols(address[] calldata protocols) external {
    uint256 length = protocols.length;
    require(length > 0, "NO_PROTOCOLS_TO_ADD");
    EnumerableSet.AddressSet storage protocolList = supportedProtocols[msg.sender];

    uint256 transferAmount = 0;
    if (protocolList.length() == 0) {
      transferAmount = obligationCost;
      emit InitialStake(msg.sender);
    }
    for (uint256 i = 0; i < length; i++) {
      address protocol = protocols[i];
      require(protocolList.add(protocol), "PROTOCOL_EXISTS");
      supportingStakers[protocol].add(msg.sender);
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
  function removeProtocols(address[] calldata protocols) external {
    uint256 length = protocols.length;
    require(length > 0, "NO_PROTOCOLS_TO_REMOVE");
    EnumerableSet.AddressSet storage tokenList = supportedProtocols[msg.sender];
    for (uint256 i = 0; i < length; i++) {
      address token = protocols[i];
      require(tokenList.remove(token), "PROTOCOL_DOES_NOT_EXIST");
      supportingStakers[token].remove(msg.sender);
    }
    uint256 transferAmount = protocolCost * length;
    if (tokenList.length() == 0) {
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
    EnumerableSet.AddressSet storage supportedProtocolList = supportedProtocols[
      msg.sender
    ];
    uint256 length = supportedProtocolList.length();
    require(length > 0, "NO_PROTOCOLS_TO_REMOVE");
    address[] memory protocolList = new address[](length);

    for (uint256 i = length; i > 0; ) {
      i--;
      address protocol = supportedProtocolList.at(i);
      protocolList[i] = protocol;
      supportedProtocolList.remove(protocol);
      supportingStakers[protocol].remove(msg.sender);
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
    address protocol
  ) external view returns (bool) {
    return supportedProtocols[staker].contains(protocol);
  }

  /**
   * @notice Return a list of all supported tokens for a given staker
   * @param staker account address of the staker
   * @return protocolList array of all the supported protocols
   */
  function getSupportedProtocols(
    address staker
  ) external view returns (address[] memory protocolList) {
    EnumerableSet.AddressSet storage protocols = supportedProtocols[staker];
    uint256 length = protocols.length();
    protocolList = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      protocolList[i] = protocols.at(i);
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
    uint256 tokenCount = supportedProtocols[staker].length();
    if (tokenCount == 0) {
      return 0;
    }
    return obligationCost + protocolCost * tokenCount;
  }
}
