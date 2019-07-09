pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/market/contracts/Market.sol";
import "@airswap/tokens/contracts/FungibleToken.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Indexer: An Index of Markets by Token Pair
  */
contract Indexer is Ownable {

  // Token to be used for staking (ERC-20)
  address public stakeToken;

  // Minimum token amount required for staking
  uint256 public stakeMinimum;

  // Mapping of token to token for market lookup
  mapping (address => mapping (address => address)) public markets;

  // Mapping of address to timestamp for blacklisting
  mapping (address => uint256) public blacklist;

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event CreateMarket(
    address makerToken,
    address takerToken
  );

  event Stake(
    address wallet,
    uint256 amount
  );

  event Unstake(
    address wallet,
    uint256 amount
  );

  event SetStakeMinimum(
    uint256 amount
  );

  event AddToBlacklist(
    address token
  );

  event RemoveFromBlacklist(
    address token
  );

  /** 
    * @notice Contract Constructor
    *
    * @param _stakeToken address
    * @param _stakeMinimum uint256
    */
  constructor(address _stakeToken, uint256 _stakeMinimum) public {
    stakeToken = _stakeToken;
    stakeMinimum = _stakeMinimum;
    emit SetStakeMinimum(stakeMinimum);
  }

  /**
    * @notice Create a Market (Collection of Intents to Trade)
    * @dev Deploys a new Market contract and tracks the address
    *
    * @param makerToken address
    * @param takerToken address
    */
  function createMarket(
    address makerToken,
    address takerToken
  ) external {

    // Ensure the market does not exist.
    require(markets[makerToken][takerToken] == address(0),
      "MARKET_ALREADY_EXISTS");

    // Create a new Market contract for the token pair.
    markets[makerToken][takerToken] = address(new Market(makerToken, takerToken));
    emit CreateMarket(makerToken, takerToken);
  }

  /**
    * @notice Set the Minimum Staking Amount
    * @param _stakeMinimum uint256
    */
  function setStakeMinimum(
    uint256 _stakeMinimum
  ) external onlyOwner {
    stakeMinimum = _stakeMinimum;
    emit SetStakeMinimum(stakeMinimum);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param token address
    */
  function addToBlacklist(
    address token
  ) external onlyOwner {
    blacklist[token] = block.timestamp;
    emit AddToBlacklist(token);
  }

  /**
    * @notice Remove a Token from the Blacklist
    * @param token address
    */
  function removeFromBlacklist(
    address token
  ) external onlyOwner {
    blacklist[token] = 0;
    emit RemoveFromBlacklist(token);
  }

  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param makerToken address
    * @param takerToken address
    * @param amount uint256
    * @param expiry uint256
    * @param locator bytes32
    */
  function setIntent(
    address makerToken,
    address takerToken,
    uint256 amount,
    uint256 expiry,
    bytes32 locator
  ) external {

    // Ensure both of the tokens are not blacklisted.
    require(blacklist[makerToken] == 0 && blacklist[takerToken] == 0,
      "MARKET_IS_BLACKLISTED");

    // Ensure the market exists.
    require(markets[makerToken][takerToken] != address(0),
      "MARKET_DOES_NOT_EXIST");

    // Ensure the amount meets the minimum.
    require(amount >= stakeMinimum,
      "MINIMUM_NOT_MET");

    // Transfer the amount for staking.
    require(FungibleToken(stakeToken).transferFrom(msg.sender, address(this), amount),
      "UNABLE_TO_STAKE");

    emit Stake(msg.sender, amount);

    // Set the intent on the market.
    Market(markets[makerToken][takerToken]).set(msg.sender, amount, expiry, locator);
  }

  /**
    * @notice Unset an Intent to Trade
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param makerToken address
    * @param takerToken address
    */
  function unsetIntent(
    address makerToken,
    address takerToken
  ) external {

    // Ensure the market exists.
    require(markets[makerToken][takerToken] != address(0),
      "MARKET_DOES_NOT_EXIST");

    // Get the intent for the sender.
    Market.Intent memory intent = Market(markets[makerToken][takerToken]).get(msg.sender);

    // Ensure the intent exists.
    require(intent.staker == msg.sender,
      "INTENT_DOES_NOT_EXIST");

    // Unset the intent on the market.
    Market(markets[makerToken][takerToken]).unset(msg.sender);

    // Return the staked tokens.
    FungibleToken(stakeToken).transfer(msg.sender, intent.amount);
    emit Unstake(msg.sender, intent.amount);
  }

  /**
    * @notice Get the Intents to Trade for a Market
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param makerToken address
    * @param takerToken address
    * @param count uint256
    * @return locators bytes32[]
    */
  function getIntents(
    address makerToken,
    address takerToken,
    uint256 count
  ) external view returns (bytes32[] memory) {

    // TODO: Do not throw for onchain integrations.

    // Ensure both of the tokens are not blacklisted
    require(blacklist[makerToken] == 0 && blacklist[takerToken] == 0,
      "MARKET_IS_BLACKLISTED");

    // Ensure the market exists
    require(markets[makerToken][takerToken] != address(0),
      "MARKET_DOES_NOT_EXIST");

    // Return an array of locators for the market.
    return Market(markets[makerToken][takerToken]).fetch(count);
  }

  /**
    * @notice Get the Size of a Market
    * @dev Returns the number of valid intents to trade
    *
    * @param makerToken address
    * @param takerToken address
    */
  function sizeOf(
    address makerToken,
    address takerToken
  ) external view returns (uint256) {

    // TODO: Do not throw for onchain integrations.

    // Ensure the market exists.
    require(markets[makerToken][takerToken] != address(0),
      "MARKET_DOES_NOT_EXIST");

    // Return the size of the market.
    return Market(markets[makerToken][takerToken]).getLength();
  }

}
