// SPDX-License-Identifier: MIT

import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

pragma solidity 0.8.17;

interface IDelegate {
  struct Rule {
    uint256 maxSenderAmount; // The maximum amount of ERC-20 token the delegate would send
    uint256 priceCoef; // Number to be multiplied by 10^(-priceExp) - the price coefficient
    uint256 priceExp; // Indicates location of the decimal priceCoef * 10^(-priceExp)
  }

  event SetRule(
    address indexed owner,
    address indexed senderToken,
    address indexed signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address indexed owner,
    address indexed senderToken,
    address indexed signerToken
  );

  event ProvideOrder(
    address indexed owner,
    address tradeWallet,
    address indexed senderToken,
    address indexed signerToken,
    uint256 senderAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  function setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external;

  function unsetRule(address senderToken, address signerToken) external;

  function provideOrder(ISwapERC20.OrderERC20 calldata order) external;

  function getSignerSideQuote(
    uint256 senderAmount,
    address senderToken,
    address signerToken
  ) external view returns (uint256 signerAmount);

  function getSenderSideQuote(
    uint256 signerAmount,
    address signerToken,
    address senderToken
  ) external view returns (uint256 senderAmount);

  function getMaxQuote(
    address senderToken,
    address signerToken
  ) external view returns (uint256 senderAmount, uint256 signerAmount);

  function tradeWallet() external view returns (address);
}
