// SPDX-License-Identifier: MIT

import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

pragma solidity 0.8.23;

interface IDelegate {
  struct Rule {
    address senderWallet;
    address senderToken;
    uint256 senderAmount;
    uint256 senderFilledAmount;
    address signerToken;
    uint256 signerAmount;
    uint256 expiry;
  }

  event Authorize(address signatory, address signer);
  event DelegateSwap(uint256 nonce, address signerWallet);
  event Revoke(address tmp, address signer);

  event SetRule(
    address senderWallet,
    address senderToken,
    uint256 senderAmount,
    address signerToken,
    uint256 signerAmount,
    uint256 expiry
  );

  event UnsetRule(address signer, address signerToken, address senderToken);

  error AddressInvalid();
  error RuleExpired();
  error SenderAmountInvalid();
  error SignerAmountInvalid();
  error SenderInvalid();
  error ManagerInvalid();
  error TransferFromFailed();

  function setRule(
    address sender,
    address senderToken,
    uint256 senderAmount,
    address signerToken,
    uint256 signerAmount,
    uint256 expiry
  ) external;

  function swap(
    address senderWallet,
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function unsetRule(
    address sender,
    address senderToken,
    address signerToken
  ) external;
}
