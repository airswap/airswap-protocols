pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

contract IIndexer {

  address public stakeToken;
  uint256 public stakeMinimum;
  mapping (address => mapping (address => address)) public markets;
  mapping (address => uint256) public blacklist;

  function createMarket(
    address makerToken,
    address takerToken
  ) external {}

  function setStakeMinimum(
    uint256 _stakeMinimum
  ) external {}

  function addToBlacklist(
    address token
  ) external {}

  function removeFromBlacklist(
    address token
  ) external {}

  function setIntent(
    address makerToken,
    address takerToken,
    uint256 amount,
    uint256 expiry,
    bytes32 locator
  ) external {}

  function unsetIntent(
    address makerToken,
    address takerToken
  ) external {}

  function getIntents(
    address makerToken,
    address takerToken,
    uint256 count
  ) external view returns (bytes32[] memory) {}

  function sizeOf(
    address makerToken,
    address takerToken
  ) external view returns (uint256) {}

}
