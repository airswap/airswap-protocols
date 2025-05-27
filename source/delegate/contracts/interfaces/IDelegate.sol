// SPDX-License-Identifier: MIT

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
  event DelegatedSwapFor(
    address indexed senderWallet,
    address indexed signerWallet,
    uint256 indexed nonce
  );

  event PauseStatus(bool pauseStatus);
  event Revoke(address tmp, address signer);

  event SetRule(
    address indexed senderWallet,
    address indexed senderToken,
    uint256 senderAmount,
    address indexed signerToken,
    uint256 signerAmount,
    uint256 expiry
  );

  event UnsetRule(
    address indexed senderWallet,
    address indexed senderToken,
    address indexed signerToken
  );

  error AddressInvalid();
  error ContractPaused();
  error ManagerInvalid();
  error RuleExpiredOrDoesNotExist();
  error SenderAmountInvalid();
  error SignerAmountInvalid();
  error SenderInvalid();
  error TransferFromFailed();

  function setRule(
    address senderWallet,
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
    address senderWallet,
    address senderToken,
    address signerToken
  ) external;

  function authorize(address manager) external;

  function revoke() external;

  function setSwapERC20Contract(address _swapERC20Contract) external;
}
