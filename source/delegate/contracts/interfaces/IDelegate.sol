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

  event DelegateSwap(uint256 _nonce, address _signerWallet);

  event SetRule(
    address _delegator,
    address _delegatorToken,
    uint256 _maxDelegatorAmount,
    address _takerToken,
    uint256 _minTakerAmount
  );

  event UnsetRule(
    address _delegator,
    address _delegatorToken,
    address _takerToken
  );

  function setRule(
    address _delegatorToken,
    uint256 _maxDelegatorAmount,
    address _takerToken,
    uint256 _minTakerAmount
  ) external;

  function swap(
    address _delegator,
    uint256 _nonce,
    uint256 _expiry,
    address _takerWallet,
    address _delegatorToken,
    uint256 _delegatorAmount,
    address _takerToken,
    uint256 _takerAmount,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  function unsetRule(address _delegatorToken, address _takerToken) external;
}
