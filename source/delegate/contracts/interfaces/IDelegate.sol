// SPDX-License-Identifier: MIT

import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

pragma solidity 0.8.23;

interface IDelegate {
  struct Rule {
    uint256 maxSenderAmount; // The maximum amount of ERC-20 token the delegate would send
    uint256 priceCoef; // Number to be multiplied by 10^(-priceExp) - the price coefficient
    uint256 priceExp; // Indicates location of the decimal priceCoef * 10^(-priceExp)
  }

  error InsufficientDelegatorAmount();
  error TransferFromFailed();

  event DelegateSwap(uint256 _nonce, address _signerWallet);

  event SetRule(
    address _signer,
    address _signerToken,
    uint256 _maxDelegatorAmount,
    address _senderToken,
    uint256 _minTakerAmount
  );

  event UnsetRule(
    address _signer,
    address _signerToken,
    address _senderToken
  );

  function setRule(
    address _signerToken,
    uint256 _maxDelegatorAmount,
    address _senderToken,
    uint256 _minTakerAmount
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

  function unsetRule(address _signerToken, address _senderToken) external;
}
