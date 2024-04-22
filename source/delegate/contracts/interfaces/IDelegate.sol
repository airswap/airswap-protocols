// SPDX-License-Identifier: MIT

import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

pragma solidity 0.8.23;

interface IDelegate {
  struct Rule {
    address sender;
    address senderToken;
    uint256 senderAmount;
    address signerToken;
    uint256 signerAmount;
  }

  error InsufficientDelegateAllowance();
  error InsufficientSignerAmount();
  error SignatoryInvalid();
  error TransferFromFailed();

  event Authorize(address _signatory, address _signer);
  event DelegateSwap(uint256 _nonce, address _signerWallet);
  event Revoke(address _tmp, address _signer);

  event SetRule(
    address _senderWallet,
    address _senderToken,
    uint256 _senderAmount,
    address _signerToken,
    uint256 _signerAmount
  );

  event UnsetRule(address _signer, address _signerToken, address _senderToken);

  function setRule(
    address _sender,
    address _senderToken,
    uint256 _senderAmount,
    address _signerToken,
    uint256 _signerAmount
  ) external;

  function swap(
    address _senderWallet,
    uint256 _nonce,
    uint256 _expiry,
    address _signerWallet,
    address _signerToken,
    uint256 _signerAmount,
    address _senderToken,
    uint256 _senderAmount,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  function unsetRule(
    address _sender,
    address _signerToken,
    address _senderToken
  ) external;
}
