// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "@airswap/swap/contracts/interfaces/ISwap.sol";

interface IDelegate {
  struct Rule {
    ISwap.Order order;
  }

  event Authorize(address signatory, address signer);
  event DelegatedSwapFor(
    address indexed senderWallet,
    address indexed signerWallet,
    uint256 indexed nonce
  );
  event Revoke(address tmp, address signer);

  event SetRule(
    address indexed senderWallet,
    address indexed signerToken,
    address indexed senderToken,
    uint256 signerAmount,
    uint256 senderAmount,
    uint256 expiry
  );

  event UnsetRule(
    address indexed senderWallet,
    address indexed senderToken,
    address indexed signerToken
  );

  error AddressInvalid();
  error RuleExpiredOrDoesNotExist();
  error SenderAmountInvalid();
  error SignerAmountInvalid();
  error SenderInvalid();
  error ManagerInvalid();
  error TransferFromFailed();
  error TokenKindUnknown();

  function setRule(ISwap.Order calldata order) external;

  function swap(
    ISwap.Order calldata _order,
    address _senderWallet,
    uint256 _maxRoyalty
  ) external;

  function unsetRule(
    address _senderWallet,
    address _senderToken,
    address _signerToken
  ) external;

  function authorize(address manager) external;

  function revoke() external;

  function setSwapContract(address _swapContract) external;
}
