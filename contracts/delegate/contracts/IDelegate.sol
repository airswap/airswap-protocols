pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/swap/contracts/ISwap.sol";

contract IDelegate {

  ISwap public swapContract;
  mapping (address => mapping (address => Rule)) public rules;

  struct Rule {
    uint256 maxDelegateAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  function setSwapContract(
    address _swapContract
  ) external {}

  function setRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external {}

  function unsetRule(
    address delegateToken,
    address consumerToken
  ) external {}

  function getBuyQuote(
    uint256 delegateAmount,
    address delegateToken,
    address consumerToken
  ) public view returns (uint256) {}

  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address delegateToken
  ) public view returns (uint256) {}

  function getMaxQuote(
    address delegateToken,
    address consumerToken
  ) external view returns (uint256, address, uint256, address) {}

  function provideOrder(
    uint256 nonce,
    uint256 expiry,
    address consumerWallet,
    uint256 consumerAmount,
    address consumerToken,
    address delegateWallet,
    uint256 delegateAmount,
    address delegateToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {}

  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 delegateAmount,
    address delegateToken
  ) public payable {}


}
