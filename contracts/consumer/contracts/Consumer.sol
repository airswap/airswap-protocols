pragma solidity ^0.5.10;

import "@airswap/indexer/contracts/Indexer.sol";
import "@airswap/market/contracts/Market.sol";
import "@airswap/delegate/contracts/Delegate.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
  * @title Consumer: An Onchain Liquidity Consumer for the Swap Protocol
  */
contract Consumer {

  // Indexer contract to be used to find intents to trade
  Indexer public indexerContract;

  // Swap contract to be used to settle trades
  Swap public swapContract;

  /** 
    * @notice Contract Constructor
    *
    * @param _indexerContract address
    * @param _swapContract address
    */
  constructor(
    address _indexerContract,
    address _swapContract
  ) public {
    indexerContract = Indexer(_indexerContract);
    swapContract = Swap(_swapContract);
  }

  /** 
    * @notice Find the Best Price for a Buy
    *
    * @param userReceiveAmount uint256
    * @param userReceiveToken address
    * @param userSendToken address
    *
    * @return Best priced Delegate (address) and its quote amount (uint256)
    */
  function findBestBuy(
    uint256 userReceiveAmount,
    address userReceiveToken,
    address userSendToken,
    uint256 maxIntents
  ) public view returns (address, uint256) {

    // Fetch an array of Intent locators from the Indexer.
    bytes32[] memory locators = indexerContract.getIntents(userReceiveToken, userSendToken, maxIntents);

    address location;
    uint256 lowestCost = 2**256 - 1;
    uint256 userSendAmount;

    // Iterate through locators.
    for (uint256 i; i < locators.length; i ++) {

      // Assume the locator is a Delegate.
      address delegateContract = address(bytes20(locators[i]));

      // Get a buy quote from the Delegate.
      userSendAmount = Delegate(delegateContract).getBuyQuote(userReceiveAmount, userReceiveToken, userSendToken);

      // Update the lowest cost.
      if (userSendAmount < lowestCost) {
        location = delegateContract;
        lowestCost = userSendAmount;
      }
    }

    // Return the Delegate address and amount.
    return (location, lowestCost);
  }

  /** 
    * @notice Take the Best Price for a Buy
    *
    * @param userReceiveAmount uint256
    * @param userReceiveToken address
    * @param userSendToken address
    * @param maxIntents uint256
    */
  function takeBestBuy(
    uint256 userReceiveAmount,
    address userReceiveToken,
    address userSendToken,
    uint256 maxIntents
  ) public {

    address untrustedDelegateContract;
    uint256 userSendAmount;

    // Find the best buy among Indexed Delegates.
    (untrustedDelegateContract, userSendAmount) = 
      findBestBuy(userReceiveAmount, userReceiveToken, userSendToken, maxIntents);

    // Consumer transfers User amount to itself.
    IERC20(userSendToken).transferFrom(msg.sender, address(this), userSendAmount);

    // Consumer approves Swap to move its new tokens.
    IERC20(userSendToken).approve(address(swapContract), userSendAmount);

    // Consumer authorizes the Delegate.
    swapContract.authorize(untrustedDelegateContract, block.timestamp);

    // Consumer provides unsigned order to Delegate
    Delegate(untrustedDelegateContract).provideUnsignedOrder(
      1,
      userSendAmount,
      userSendToken,
      userReceiveAmount,
      userReceiveToken
    );

    // Consumer revokes the authorization of the Delegate.
    swapContract.revoke(untrustedDelegateContract);

    // Consumer transfers received amount to the User.
    IERC20(userReceiveToken).transfer(msg.sender, userReceiveAmount);

  }

}