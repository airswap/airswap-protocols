pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

/**
  * @title Market: A List of Intents to Trade
  */
contract Market {

  // Token pair of the market
  address public makerToken;
  address public takerToken;

  // Length of the list
  uint256 public length;

  // Maximum address value to indicate the head
  address private constant HEAD = address(uint160(2**160-1));

  // Byte values to map to the previous and next
  byte constant private PREV = 0x00;
  byte constant private NEXT = 0x01;

  // Mapping of staker address to its neighbors
  mapping(address => mapping(byte => Intent)) list;

  /**
    * @notice Intent to Trade
    * 
    * @param staker address
    * @param amount uint256
    * @param expiry uint256
    * @param locator bytes32
    */
  struct Intent {
    address staker;
    uint256 amount;
    uint256 expiry;
    bytes32 locator;
  }

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event Set(
    address staker,
    uint256 amount,
    uint256 expiry,
    bytes32 locator,
    address makerToken,
    address takerToken
  );

  event Unset(
    address staker,
    address makerToken,
    address takerToken
  );

  /** 
    * @notice Contract Constructor
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  constructor (
    address _makerToken,
    address _takerToken
  ) public {

    // Set the token pair fo the market.
    makerToken = _makerToken;
    takerToken = _takerToken;

    // Initialize the list.
    Intent memory head = Intent(HEAD, 0, 0, "0x0");
    list[HEAD][PREV] = head;
    list[HEAD][NEXT] = head;
  }

  /** 
    * @notice Set an Intent to Trade
    *
    * @param staker The account 
    * @param amount uint256
    * @param expiry uint256
    * @param locator bytes32
    */
  function set(
    address staker,
    uint256 amount,
    uint256 expiry, 
    bytes32 locator
  ) external {

    Intent memory newIntent = Intent(staker, amount, expiry, locator);

    // Insert after the next highest amount on the list.
    insert(newIntent, find(amount));

    // Increment the length of the list.
    length = length + 1;

    emit Set(staker, amount, expiry, locator, makerToken, takerToken);
  }

  /** 
    * @notice Unset an Intent to Trade
    * @param staker address
    */
  function unset(
    address staker
  ) public returns (bool) {

    // Ensure the staker is in the list.
    if (!has(staker)) {
      return false;
    }

    // Link its neighbors together.
    link(list[staker][PREV], list[staker][NEXT]);

    // Delete staker from the list.
    delete list[staker][PREV];
    delete list[staker][NEXT];

    // Decrement the length of the list.
    length = length - 1;

    emit Unset(staker, makerToken, takerToken);
    return true;
  }

  /** 
    * @notice Get the Intent for a Staker
    * @param staker address
    */
  function get(
    address staker
  ) public view returns (Intent memory) {

    // Ensure the staker has a neighbor in the list.
    if (list[staker][PREV].staker != address(0)) {

      // Return the next intent from the previous neighbor.
      return list[list[staker][PREV].staker][NEXT];
    }
  }

  /** 
    * @notice Determine Whether a Staker is in the List
    * @param staker address
    */
  function has(
    address staker
  ) internal view returns (bool) {
    if (list[staker][PREV].staker == HEAD && list[staker][NEXT].staker == HEAD) {
      if (list[HEAD][NEXT].staker == staker) {
        return true;
      }
    } else {
      if (list[staker][PREV].staker != address(0)) {
        if (list[list[staker][PREV].staker][NEXT].staker == staker) {
          return true;
        }
      }
    }
    return false;
  }

  /** 
    * @notice Return the Length
    */
  function getLength() public view returns (uint256) {
    return length;
  }

  /** 
    * @notice Get Valid Intents
    * @param count uint256
    */
  function fetch(
    uint256 count
  ) public view returns (bytes32[] memory result) {

    // Limit results to list length or count.
    uint256 limit = length;
    if (count < length) {
      limit = count;
    }
    result = new bytes32[](limit);

    // Get the first intent in the list.
    Intent storage intent = list[HEAD][NEXT];

    // Iterate over the list until the end or limit.
    uint256 i = 0;
    while (intent.amount > 0 && i < limit) {
      if (intent.expiry >= block.timestamp) {
        result[i] = intent.locator;
        i = i + 1;
      }
      intent = list[intent.staker][NEXT];
    }
    return result;
  }

  /** 
    * @notice Find the Next Intent Below an Amount
    * @param amount uint256
    */
  function find(
    uint256 amount
  ) internal view returns (Intent memory) {

    // Get the first intent in the list.
    Intent storage intent = list[HEAD][NEXT];

    // Iterate through the list until a lower amount is found.
    while (intent.amount > 0) {
      if (amount <= intent.amount) {
        return intent;
      }
      intent = list[intent.staker][NEXT];
    }
    return intent;
  }

  /** 
    * @notice Insert an Intent at a Location
    *
    * @param intent Intent
    * @param existing Intent
    */
  function insert(
    Intent memory intent,
    Intent memory existing
  ) internal returns (bool) {

    // Ensure the existing intent is in the list.
    if (!has(existing.staker)) {
      return false;
    }

    // Get the intent following the existing intent.
    Intent memory next = list[existing.staker][NEXT];

    // Link the new intent into place.
    link(existing, intent);
    link(intent, next);

    return true;
  }

  /** 
    * @notice Link Two Intents
    * 
    * @param left Intent
    * @param right Intent
    */
  function link(
    Intent memory left,
    Intent memory right
  ) internal {
    list[left.staker][NEXT] = right;
    list[right.staker][PREV] = left;
  }

}