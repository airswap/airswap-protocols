pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/lib/contracts/Types.sol";

contract ISwap {

  mapping (address => mapping (uint256 => byte)) public makerOrderStatus;
  mapping (address => mapping (address => uint256)) public approvals;
  mapping (address => uint256) public makerMinimumNonce;

  function swap(
    Types.Order calldata order,
    Types.Signature calldata signature
  ) external payable {}

  function swapSimple(
    uint256 nonce,
    uint256 expiry,
    address makerWallet,
    uint256 makerParam,
    address makerToken,
    address takerWallet,
    uint256 takerParam,
    address takerToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external payable {}

  function cancel(
    uint256[] calldata nonces
  ) external {}

  function invalidate(
    uint256 minimumNonce
  ) external {}

  function authorize(
    address delegate,
    uint256 expiry
  ) public {}

  function revoke(
    address delegate
  ) public {}

  function isAuthorized(
    address approver,
    address delegate
  ) public view returns (bool) {}

}
