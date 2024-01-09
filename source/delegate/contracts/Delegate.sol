// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./interfaces/IDelegate.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Delegate: Deployable Trading Rules for the AirSwap Network
 * @notice Supports fungible tokens (ERC-20)
 * @dev inherits IDelegate, Ownable uses SafeMath library
 */
contract Delegate is IDelegate, Ownable {
  using SafeMath for uint256;

  // The Swap contract to be used to settle trades
  ISwapERC20 public swapContract;

  // Maximum integer for token transfer approval
  uint256 internal constant MAX_INT = 2 ** 256 - 1;

  // Address holding tokens that will be trading through this delegate
  address public tradeWallet;

  // Mapping of senderToken to signerToken for rule lookup
  mapping(address => mapping(address => Rule)) public rules;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 internal constant ERC20_INTERFACE_ID = 0x36372b07;

  // The protocol identifier for setting intents on an Index
  bytes2 public protocol;

  /**
   * @notice Contract Constructor
   * @dev owner defaults to msg.sender if delegateContractOwner is provided as address(0)
   * @param delegateSwap address Swap contract the delegate will deploy with
   * @param delegateContractOwner address Owner of the delegate
   * @param delegateTradeWallet address Wallet the delegate will trade from
   * @param delegateProtocol bytes2 The protocol identifier for Delegate contracts
   */
  constructor(
    ISwapERC20 delegateSwap,
    address delegateContractOwner,
    address delegateTradeWallet,
    bytes2 delegateProtocol
  ) {
    swapContract = delegateSwap;
    protocol = delegateProtocol;

    // If no delegate owner is provided, the deploying address is the owner.
    if (delegateContractOwner != address(0)) {
      transferOwnership(delegateContractOwner);
    }

    // If no trade wallet is provided, the owner's wallet is the trade wallet.
    if (delegateTradeWallet != address(0)) {
      tradeWallet = delegateTradeWallet;
    } else {
      tradeWallet = owner();
    }
  }

  /**
   * @notice Set a Trading Rule
   * @dev only callable by the owner of the contract
   * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   * @param maxSenderAmount uint256 Maximum amount of ERC-20 token the delegate would send
   * @param priceCoef uint256 Whole number that will be multiplied by 10^(-priceExp) - the price coefficient
   * @param priceExp uint256 Exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
   */
  function setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {
    _setRule(senderToken, signerToken, maxSenderAmount, priceCoef, priceExp);
  }

  /**
   * @notice Unset a Trading Rule
   * @dev only callable by the owner of the contract, removes from a mapping
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   */
  function unsetRule(
    address senderToken,
    address signerToken
  ) external onlyOwner {
    _unsetRule(senderToken, signerToken);
  }

  /**
   * @notice Provide an Order
   * @dev Rules get reset with new maxSenderAmount
   * @param order Types.Order Order a user wants to submit to Swap.
   */
  function provideOrder(ISwapERC20.OrderERC20 calldata order) external {
    Rule memory rule = rules[order.senderToken][order.signerToken];

    require(order.v != 0, "SIGNATURE_MUST_BE_SENT");

    // Ensure the order is for the trade wallet.
    require(order.senderWallet == tradeWallet, "SENDER_WALLET_INVALID");

    // Ensure the tokens are valid ERC20 tokens.
    // require(
    //   order.signer.kind == ERC20_INTERFACE_ID,
    //   "SIGNER_KIND_MUST_BE_ERC20"
    // );

    // require(
    //   order.sender.kind == ERC20_INTERFACE_ID,
    //   "SENDER_KIND_MUST_BE_ERC20"
    // );

    // Ensure that a rule exists.
    require(rule.maxSenderAmount != 0, "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(order.senderAmount <= rule.maxSenderAmount, "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(
      order.senderAmount <=
        _calculateSenderAmount(
          order.signerAmount,
          rule.priceCoef,
          rule.priceExp
        ),
      "PRICE_INVALID"
    );

    // Overwrite the rule with a decremented maxSenderAmount.
    rules[order.senderToken][order.signerToken] = Rule({
      maxSenderAmount: (rule.maxSenderAmount).sub(order.senderAmount),
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(
      order.senderWallet,
      order.nonce,
      order.expiry,
      order.signerWallet,
      order.signerToken,
      order.signerAmount,
      order.senderToken,
      order.senderAmount,
      order.v,
      order.r,
      order.s
    );

    emit ProvideOrder(
      owner(),
      tradeWallet,
      order.senderToken,
      order.signerToken,
      order.senderAmount,
      rule.priceCoef,
      rule.priceExp
    );
  }

  /**
   * @notice Set a new trade wallet
   * @param newTradeWallet address Address of the new trade wallet
   */
  function setTradeWallet(address newTradeWallet) external onlyOwner {
    require(newTradeWallet != address(0), "TRADE_WALLET_REQUIRED");
    tradeWallet = newTradeWallet;
  }

  /**
   * @notice Get a Signer-Side Quote from the Delegate
   * @param senderAmount uint256 Amount of ERC-20 token the delegate would send
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   * @return signerAmount uint256 signerAmount Amount of ERC-20 token the consumer would send
   */
  function getSignerSideQuote(
    uint256 senderAmount,
    address senderToken,
    address signerToken
  ) external view returns (uint256 signerAmount) {
    Rule memory rule = rules[senderToken][signerToken];

    // Ensure that a rule exists.
    if (rule.maxSenderAmount > 0) {
      // Ensure the senderAmount does not exceed maximum for the rule.
      if (senderAmount <= rule.maxSenderAmount) {
        signerAmount = _calculateSignerAmount(
          senderAmount,
          rule.priceCoef,
          rule.priceExp
        );

        // Return the quote.
        return signerAmount;
      }
    }
    return 0;
  }

  /**
   * @notice Get a Sender-Side Quote from the Delegate
   * @param signerAmount uint256 Amount of ERC-20 token the consumer would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @return senderAmount uint256 Amount of ERC-20 token the delegate would send
   */
  function getSenderSideQuote(
    uint256 signerAmount,
    address signerToken,
    address senderToken
  ) external view returns (uint256 senderAmount) {
    Rule memory rule = rules[senderToken][signerToken];

    // Ensure that a rule exists.
    if (rule.maxSenderAmount > 0) {
      // Calculate the senderAmount.
      senderAmount = _calculateSenderAmount(
        signerAmount,
        rule.priceCoef,
        rule.priceExp
      );

      // Ensure the senderAmount does not exceed the maximum trade amount.
      if (senderAmount <= rule.maxSenderAmount) {
        return senderAmount;
      }
    }
    return 0;
  }

  /**
   * @notice Get a Maximum Quote from the Delegate
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   * @return senderAmount uint256 Amount the delegate would send
   * @return signerAmount uint256 Amount the consumer would send
   */
  function getMaxQuote(
    address senderToken,
    address signerToken
  ) external view returns (uint256 senderAmount, uint256 signerAmount) {
    Rule memory rule = rules[senderToken][signerToken];

    senderAmount = rule.maxSenderAmount;

    // Ensure that a rule exists.
    if (senderAmount > 0) {
      // calculate the signerAmount
      signerAmount = _calculateSignerAmount(
        senderAmount,
        rule.priceCoef,
        rule.priceExp
      );

      // Return the maxSenderAmount and calculated signerAmount.
      return (senderAmount, signerAmount);
    }
    return (0, 0);
  }

  /**
   * @notice Set a Trading Rule
   * @dev only callable by the owner of the contract
   * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   * @param maxSenderAmount uint256 Maximum amount of ERC-20 token the delegate would send
   * @param priceCoef uint256 Whole number that will be multiplied by 10^(-priceExp) - the price coefficient
   * @param priceExp uint256 Exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
   */
  function _setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) internal {
    require(priceCoef > 0, "PRICE_COEF_INVALID");
    rules[senderToken][signerToken] = Rule({
      maxSenderAmount: maxSenderAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

    emit SetRule(
      owner(),
      senderToken,
      signerToken,
      maxSenderAmount,
      priceCoef,
      priceExp
    );
  }

  /**
   * @notice Unset a Trading Rule
   * @param senderToken address Address of an ERC-20 token the delegate would send
   * @param signerToken address Address of an ERC-20 token the consumer would send
   */
  function _unsetRule(address senderToken, address signerToken) internal {
    // using non-zero rule.priceCoef for rule existence check
    if (rules[senderToken][signerToken].priceCoef > 0) {
      // Delete the rule.
      delete rules[senderToken][signerToken];
      emit UnsetRule(owner(), senderToken, signerToken);
    }
  }

  /**
   * @notice Calculate the signer amount for a given sender amount and price
   * @param senderAmount uint256 The amount the delegate would send in the swap
   * @param priceCoef uint256 Coefficient of the token price defined in the rule
   * @param priceExp uint256 Exponent of the token price defined in the rule
   */
  function _calculateSignerAmount(
    uint256 senderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) internal pure returns (uint256 signerAmount) {
    // Calculate the signer amount using the price formula
    uint256 multiplier = senderAmount.mul(priceCoef);
    signerAmount = multiplier.div(10 ** priceExp);

    // If the div rounded down, round up
    if (multiplier.mod(10 ** priceExp) > 0) {
      signerAmount++;
    }
  }

  /**
   * @notice Calculate the sender amount for a given signer amount and price
   * @param signerAmount uint256 The amount the signer would send in the swap
   * @param priceCoef uint256 Coefficient of the token price defined in the rule
   * @param priceExp uint256 Exponent of the token price defined in the rule
   */
  function _calculateSenderAmount(
    uint256 signerAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) internal pure returns (uint256 senderAmount) {
    // Calculate the sender anount using the price formula
    senderAmount = signerAmount.mul(10 ** priceExp).div(priceCoef);
  }
}
