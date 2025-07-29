// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

interface IDelegateERC20 {
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
  event DelegatedSwapERC20For(
    address indexed senderWallet,
    address indexed signerWallet,
    uint256 indexed nonce
  );
  event Revoke(address tmp, address signer);

  event SetRuleERC20(
    address indexed senderWallet,
    address indexed senderToken,
    uint256 senderAmount,
    address indexed signerToken,
    uint256 signerAmount,
    uint256 expiry
  );

  event UnsetRuleERC20(
    address indexed senderWallet,
    address indexed senderToken,
    address indexed signerToken
  );

  error AddressInvalid();
  error RuleERC20ExpiredOrDoesNotExist();
  error SenderAmountInvalid();
  error SignerAmountInvalid();
  error SenderInvalid();
  error ManagerInvalid();
  error TransferFromFailed();

  function setRuleERC20(
    address senderWallet,
    address senderToken,
    uint256 senderAmount,
    address signerToken,
    uint256 signerAmount,
    uint256 expiry
  ) external;

  function swapERC20(
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

  function unsetRuleERC20(
    address senderWallet,
    address senderToken,
    address signerToken
  ) external;

  function authorize(address manager) external;

  function revoke() external;

  function setSwapERC20Contract(address _swapERC20Contract) external;
}
