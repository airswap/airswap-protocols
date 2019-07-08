pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/swap/contracts/Swap.sol";
import "@airswap/lib/contracts/Types.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Delegate: Deployable Trading Rules for the Swap Protocol
  * @notice Supports fungible tokens (ERC-20)
  */
contract Delegate is Ownable {
  using SafeMath for uint256;

  // Swap contract to be used to settle trades
  address public swapContract;

  // Mapping of delegateToken to consumerToken for rule lookup
  mapping (address => mapping (address => Rule)) public rules;

  /**
    * @notice Trading Rule
    * 
    * @param maxDelegateAmount uint256
    * @param priceCoef uint256
    * @param priceExp uint256
    */
  struct Rule {
    uint256 maxDelegateAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event SetRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  );

  event UnsetRule(
    address delegateToken,
    address consumerToken
  );

  /** 
    * @notice Contract Constructor
    * @param _swapContract address
    */
  constructor(address _swapContract) public {
    swapContract = _swapContract;
  }

  /** 
    * @notice Set the Swap Contract
    * @param _swapContract address
    */
  function setSwapContract(address _swapContract) external onlyOwner {
    swapContract = _swapContract;
  }

  /** 
    * @notice Set a Trading Rule
    *
    * @param delegateToken address
    * @param consumerToken address
    * @param maxDelegateAmount uint256
    * @param priceCoef uint256
    * @param priceExp uint256
    */
  function setRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {

    rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: maxDelegateAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

    emit SetRule(
      delegateToken,
      consumerToken,
      maxDelegateAmount,
      priceCoef,
      priceExp
    );
  }

  /** 
    * @notice Unset a Trading Rule
    *
    * @param delegateToken address
    * @param consumerToken address
    */
  function unsetRule(
    address delegateToken,
    address consumerToken
  ) external onlyOwner {

    // Delete the rule.
    delete rules[delegateToken][consumerToken];

    emit UnsetRule(
      delegateToken,
      consumerToken
    );
  }

  /**
    * @notice Get a Buy Quote
    *
    * @param delegateAmount uint256
    * @param delegateToken address
    * @param consumerToken address
    */
  function getBuyQuote(
    uint256 delegateAmount,
    address delegateToken,
    address consumerToken
  ) public view returns (uint256) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the delegateAmount does not exceed maximum for the rule.
    require(delegateAmount <= rule.maxDelegateAmount,
      "AMOUNT_EXCEEDS_MAX");

    return delegateAmount
      .mul(rule.priceCoef)
      .mul(10 ** rule.priceExp);

  }

  /**
    * @notice Get a Sell Quote
    *
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateToken address
    */
  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address delegateToken
  ) public view returns (uint256) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Calculate the delegateAmount.
    uint256 delegateAmount = consumerAmount
      .div(10 ** rule.priceExp).div(rule.priceCoef);

    // Ensure the delegateAmount does not exceed maximum for the rule.
    require(delegateAmount <= rule.maxDelegateAmount,
      "AMOUNT_EXCEEDS_MAX");

    return delegateAmount;

  }

  /**
    * @notice Get a Maximum Quote
    *
    * @param delegateToken address
    * @param consumerToken address
    * @return (uint256, address, uint256, address)
    */
  function getMaxQuote(
    address delegateToken,
    address consumerToken
  ) external view returns (uint256, address, uint256, address) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Return the maxDelegateAmount and calculated consumerAmount.
    return (
      rule.maxDelegateAmount,
      delegateToken,
      rule.maxDelegateAmount.mul(rule.priceCoef).mul(10 ** rule.priceExp),
      consumerToken
    );

  }

  /**
    * @notice Provide an Order (Simple)
    * @dev Rules get reset with new maxDelegateAmount
    *
    * @param nonce uint256
    * @param expiry uint256
    * @param consumerWallet address
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateWallet address
    * @param delegateAmount uint256
    * @param delegateToken address
    * @param v uint8
    * @param r bytes32
    * @param s bytes32
    */
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
  ) public payable {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(delegateAmount <= rule.maxDelegateAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(delegateAmount.mul(rule.priceCoef)
      .mul(10 ** rule.priceExp) == consumerAmount,
      "PRICE_INCORRECT");

    // Overwrite thr ule with a decremented maxDelegateAmount.
    rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: rule.maxDelegateAmount - delegateAmount,
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    Swap(swapContract).swapSimple(nonce, expiry,
      consumerWallet, consumerAmount, consumerToken,
      delegateWallet, delegateAmount, delegateToken,
      v, r, s
    );

  }

  /**
    * @notice Provide an Unsigned Order (Simple)
    * @dev Requires that sender has authorized the delegate (Swap)
    *
    * @param nonce uint256
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateAmount uint256
    * @param delegateToken address
    */
  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 delegateAmount,
    address delegateToken
  ) public payable {

    provideOrder(
      nonce,
      block.timestamp,
      msg.sender,
      consumerAmount,
      consumerToken,
      owner(),
      delegateAmount,
      delegateToken,
      0, 0, 0
    );

  }


}
