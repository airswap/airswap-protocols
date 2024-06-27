// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

interface IRegistry {
  event SetServerURL(address indexed staker, string url);
  event AddProtocols(address indexed staker, bytes4[] protocols);
  event AddTokens(address indexed staker, address[] tokens);
  event RemoveProtocols(address indexed staker, bytes4[] protocols);
  event RemoveTokens(address indexed staker, address[] tokens);
  event UnsetServer(
    address indexed staker,
    string url,
    bytes4[] protocols,
    address[] tokens
  );

  error ArgumentInvalid();
  error NoServerURLSet();
  error ProtocolDoesNotExist(bytes4);
  error ProtocolExists(bytes4);
  error TokenDoesNotExist(address);
  error TokenExists(address);
  error ServerURLInvalid();

  function setServerURL(string calldata _url) external;

  function unsetServer() external;

  function addProtocols(bytes4[] calldata _protocols) external;

  function removeProtocols(bytes4[] calldata _protocols) external;

  function getServerURLsForProtocol(
    bytes4 _protocol
  ) external view returns (string[] memory _urls);

  function supportsProtocol(
    address _staker,
    bytes4 _protocol
  ) external view returns (bool);

  function getProtocolsForStaker(
    address _staker
  ) external view returns (bytes4[] memory _protocolList);

  function getStakersForProtocol(
    bytes4 _protocol
  ) external view returns (address[] memory _stakers);

  function addTokens(address[] calldata _tokens) external;

  function removeTokens(address[] calldata _tokens) external;

  function getServerURLsForToken(
    address _token
  ) external view returns (string[] memory urls);

  function supportsToken(
    address _staker,
    address _token
  ) external view returns (bool);

  function getTokensForStaker(
    address _staker
  ) external view returns (address[] memory tokenList);

  function getStakersForToken(
    address _token
  ) external view returns (address[] memory _stakers);

  function getServerURLsForStakers(
    address[] calldata _stakers
  ) external view returns (string[] memory _urls);

  function balanceOf(address _staker) external view returns (uint256);
}
