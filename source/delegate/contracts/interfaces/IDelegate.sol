// SPDX-License-Identifier: MIT

import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

pragma solidity 0.8.23;

interface IDelegate {
  struct Rule {
    address sender;
    address senderToken;
    uint256 senderRuleAmount;
    uint256 senderFilledAmount;
    address signerToken;
    uint256 signerAmount;
    uint256 ruleExpiry;
  }

  error RuleExpired();
  error InvalidAddress();
  error InvalidSenderAmount();
  error InvalidSignerAmount();
  error ManagerInvalid();
  error SenderInvalid();
  error TransferFromFailed();

  event Authorize(address signatory, address signer);
  event DelegateSwap(uint256 nonce, address signerWallet);
  event Revoke(address tmp, address signer);

  event SetRule(
    address senderWallet,
    address senderToken,
    uint256 senderRuleAmount,
    uint256 senderFilledAmount,
    address signerToken,
    uint256 signerAmount,
    uint256 ruleExpiry
  );

  event UnsetRule(address signer, address signerToken, address senderToken);

  function setRule(
    address sender,
    address senderToken,
    uint256 senderRuleAmount,
    address signerToken,
    uint256 signerAmount,
    uint256 ruleExpiry
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
    address signerToken,
    address senderToken
  ) external;
}
