pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;
// File: @airswap/indexer/contracts/interfaces/IIndexer.sol
/*
  Copyright 2019 Swap Holdings Ltd.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
interface IIndexer {
  event CreateIndex(
    address signerToken,
    address senderToken
  );
  event Stake(
    address wallet,
    address signerToken,
    address senderToken,
    uint256 amount
  );
  event Unstake(
    address wallet,
    address signerToken,
    address senderToken,
    uint256 amount
  );
  event AddToBlacklist(
    address token
  );
  event RemoveFromBlacklist(
    address token
  );
  function stakingToken() external returns (address);
  function indexes(address, address) external returns (address);
  function blacklist(address) external returns (bool);
  function setLocatorWhitelist(
    address locatorWhitelist
  ) external;
  function createIndex(
    address signerToken,
    address senderToken
  ) external returns (address);
  function addToBlacklist(
    address token
  ) external;
  function removeFromBlacklist(
    address token
  ) external;
  function setIntent(
    address signerToken,
    address senderToken,
    uint256 amount,
    bytes32 locator
  ) external;
  function unsetIntent(
    address signerToken,
    address senderToken
  ) external;
  function unsetIntentForUser(
    address user,
    address signerToken,
    address senderToken
  ) external;
  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken
  ) external view returns (uint256);
  function getLocators(
    address signerToken,
    address senderToken,
    address startAddress,
    uint256 count
  ) external view returns (bytes32[] memory);
}
// File: @airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol
/*
  Copyright 2019 Swap Holdings Ltd.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
interface ILocatorWhitelist {
  function has(
    bytes32 locator
  ) external view returns (bool);
}
// File: openzeppelin-solidity/contracts/ownership/Ownable.sol
/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be aplied to your functions to restrict their use to
 * the owner.
 */
contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }
    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }
    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }
    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }
    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }
    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}
// File: @airswap/index/contracts/Index.sol
/*
  Copyright 2019 Swap Holdings Ltd.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/**
  * @title Index: A List of Locators
  */
contract Index is Ownable {
  // The number of entries in the index
  uint256 public length;
  // Identifier to use for the head of the list
  address private constant HEAD = address(uint160(2**160-1));
  // Mapping of an identifier to its entry
  mapping(address => Entry) private _entries;
  /**
    * @notice Index Entry
    * @param score uint256
    * @param locator bytes32
    * @param prev address Previous address in the linked list
    * @param next address Next address in the linked list
    */
  struct Entry {
    bytes32 locator;
    uint256 score;
    address prev;
    address next;
  }
  /**
    * @notice Contract Events
    */
  event SetLocator(
    address indexed identifier,
    uint256 score,
    bytes32 indexed locator
  );
  event UnsetLocator(
    address indexed identifier
  );
  /**
    * @notice Contract Constructor
    */
  constructor() public {
    // Create initial entry.
    _entries[HEAD] = Entry(bytes32(0), 0, HEAD, HEAD);
  }
  /**
    * @notice Set a Locator
    * @param identifier address On-chain address identifying the owner of a locator
    * @param score uint256 Score for the locator being set
    * @param locator bytes32 Locator
    */
  function setLocator(
    address identifier,
    uint256 score,
    bytes32 locator
  ) external onlyOwner {
    // Ensure the entry does not already exist.
    require(!_hasEntry(identifier), "ENTRY_ALREADY_EXISTS");
    // Find the first entry with a lower score.
    address nextEntry = _getEntryLowerThan(score);
    // Link the new entry between previous and next.
    address prevEntry = _entries[nextEntry].prev;
    _entries[prevEntry].next = identifier;
    _entries[nextEntry].prev = identifier;
    _entries[identifier] = Entry(locator, score, prevEntry, nextEntry);
    // Increment the index length.
    length = length + 1;
    emit SetLocator(identifier, score, locator);
  }
  /**
    * @notice Unset a Locator
    * @param identifier address On-chain address identifying the owner of a locator
    */
  function unsetLocator(
    address identifier
  ) external onlyOwner {
    // Ensure the entry exists.
    require(_hasEntry(identifier), "ENTRY_DOES_NOT_EXIST");
    // Link the previous and next entries together.
    address prevUser = _entries[identifier].prev;
    address nextUser = _entries[identifier].next;
    _entries[prevUser].next = nextUser;
    _entries[nextUser].prev = prevUser;
    // Delete entry from the index.
    delete _entries[identifier];
    // Decrement the index length.
    length = length - 1;
    emit UnsetLocator(identifier);
  }
  /**
    * @notice Get a Score
    * @param identifier address On-chain address identifying the owner of a locator
    * @return uint256 Score corresponding to the identifier
    */
  function getScore(
    address identifier
  ) external view returns (uint256) {
    return _entries[identifier].score;
  }
  /**
    * @notice Get a Range of Locators
    * @dev start value of 0x0 starts at the head
    * @param start address Identifier to start with
    * @param count uint256 Number of locators to return
    * @return bytes32[] result List of locators
    */
  function getLocators(
    address start,
    uint256 count
  ) external view returns (bytes32[] memory result) {
    address identifier = _entries[HEAD].next;
    // If a valid start is provided, start there.
    if (start != address(0) && start != HEAD) {
      // Check that the provided start identifier exists.
      require(_hasEntry(start), "START_ENTRY_NOT_FOUND");
      // Set the identifier to the provided start.
      identifier = start;
    }
    result = new bytes32[](count);
    // Iterate over the list until the end or count.
    uint8 i = 0;
    while (i < count && identifier != HEAD) {
      result[i] = _entries[identifier].locator;
      i = i + 1;
      identifier = _entries[identifier].next;
    }
  }
  /**
    * @notice Check if the Index has an Entry
    * @param identifier address On-chain address identifying the owner of a locator
    * @return bool True if the identifier corresponds to an Entry in the list
    */
  function _hasEntry(
    address identifier
  ) internal view returns (bool) {
    return _entries[identifier].locator != bytes32(0);
  }
  /**
    * @notice Returns the largest scoring Entry Lower than a Score
    * @param score uint256 Score in question
    * @return address Identifier of the largest score lower than score
    */
  function _getEntryLowerThan(
    uint256 score
  ) internal view returns (address) {
    address identifier = _entries[HEAD].next;
    // Head indicates last because the list is circular.
    if (score == 0) {
      return HEAD;
    }
    // Iterate until a lower score is found.
    while (score <= _entries[identifier].score) {
      identifier = _entries[identifier].next;
    }
    return identifier;
  }
}
// File: openzeppelin-solidity/contracts/token/ERC20/IERC20.sol
/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see `ERC20Detailed`.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);
    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);
    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `Transfer` event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);
    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through `transferFrom`. This is
     * zero by default.
     *
     * This value changes when `approve` or `transferFrom` are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);
    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * > Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an `Approval` event.
     */
    function approve(address spender, uint256 amount) external returns (bool);
    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `Transfer` event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);
    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to `approve`. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
// File: contracts/Indexer.sol
/*
  Copyright 2019 Swap Holdings Ltd.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/**
  * @title Indexer: A Collection of Index contracts by Token Pair
  */
contract Indexer is IIndexer, Ownable {
  // Token to be used for staking (ERC-20)
  IERC20 public stakingToken;
  // Mapping of signer token to sender token to index
  mapping (address => mapping (address => Index)) public indexes;
  // Mapping of token address to boolean
  mapping (address => bool) public blacklist;
  // The whitelist contract for checking whether a peer is whitelisted
  address public locatorWhitelist;
  // Boolean marking when the contract is paused - users cannot call functions when true
  bool public contractPaused = false;
  /**
    * @notice Contract Constructor
    * @param indexerStakingToken address
    */
  constructor(
    address indexerStakingToken
  ) public {
    stakingToken = IERC20(indexerStakingToken);
  }
  /**
    * @notice Modifier to prevent function calling unless the contract is not paused
    */
  modifier notPaused() {
    require(!contractPaused, "CONTRACT_IS_PAUSED");
    _;
  }
  /**
    * @notice Modifier to prevent function calling unless the contract is paused
    */
  modifier paused() {
    require(contractPaused, "CONTRACT_NOT_PAUSED");
    _;
  }
  /**
    * @notice Set the address of an ILocatorWhitelist to use
    * @dev Clear the whitelist with a null address (0x0)
    * @param newLocatorWhitelist address Locator whitelist
    */
  function setLocatorWhitelist(
    address newLocatorWhitelist
  ) external onlyOwner {
    locatorWhitelist = newLocatorWhitelist;
  }
  /**
    * @notice Create an Index (List of Locators for a Token Pair)
    * @dev Deploys a new Index contract and stores the address
    *
    * @param signerToken address Signer token for the Index
    * @param senderToken address Sender token for the Index
    */
  function createIndex(
    address signerToken,
    address senderToken
  ) external notPaused returns (address) {
    // If the Index does not exist, create it.
    if (indexes[signerToken][senderToken] == Index(0)) {
      // Create a new Index contract for the token pair.
      indexes[signerToken][senderToken] = new Index();
      emit CreateIndex(signerToken, senderToken);
    }
    // Return the address of the Index contract.
    return address(indexes[signerToken][senderToken]);
  }
  /**
    * @notice Add a Token to the Blacklist
    * @param token address Token to blacklist
    */
  function addToBlacklist(
    address token
  ) external onlyOwner {
    if (!blacklist[token]) {
      blacklist[token] = true;
      emit AddToBlacklist(token);
    }
  }
  /**
    * @notice Remove a Token from the Blacklist
    * @param token address Token to remove from the blacklist
    */
  function removeFromBlacklist(
    address token
  ) external onlyOwner {
    if (blacklist[token]) {
      blacklist[token] = false;
      emit RemoveFromBlacklist(token);
    }
  }
  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param signerToken address Signer token of the Index being staked
    * @param senderToken address Sender token of the Index being staked
    * @param amount uint256 Amount being staked
    * @param locator bytes32 Locator of the staker
    */
  function setIntent(
    address signerToken,
    address senderToken,
    uint256 amount,
    bytes32 locator
  ) external notPaused {
    // If whitelist set, ensure the locator is valid.
    if (locatorWhitelist != address(0)) {
      require(ILocatorWhitelist(locatorWhitelist).has(locator),
      "LOCATOR_NOT_WHITELISTED");
    }
    // Ensure neither of the tokens are blacklisted.
    require(!blacklist[signerToken] && !blacklist[senderToken],
      "PAIR_IS_BLACKLISTED");
    // Ensure the index exists.
    require(indexes[signerToken][senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");
    // Only transfer for staking if amount is set.
    if (amount > 0) {
      // Transfer the amount for staking.
      require(stakingToken.transferFrom(msg.sender, address(this), amount),
        "UNABLE_TO_STAKE");
    }
    emit Stake(msg.sender, signerToken, senderToken, amount);
    // Set the locator on the index.
    indexes[signerToken][senderToken].setLocator(msg.sender, amount, locator);
  }
  /**
    * @notice Unset an Intent to Trade
    * @dev Users are allowed to unstake from blacklisted indexes
    *
    * @param signerToken address Signer token of the Index being unstaked
    * @param senderToken address Sender token of the Index being staked
    */
  function unsetIntent(
    address signerToken,
    address senderToken
  ) external notPaused {
    _unsetIntent(msg.sender, signerToken, senderToken);
  }
  /**
    * @notice Unset Intent for a User
    * @dev Only callable by owner
    * @dev This can be used when contractPaused to return staked tokens to users
    *
    * @param user address
    * @param signerToken address Signer token of the Index being unstaked
    * @param senderToken address Signer token of the Index being unstaked
    */
  function unsetIntentForUser(
    address user,
    address signerToken,
    address senderToken
  ) external onlyOwner {
    _unsetIntent(user, signerToken, senderToken);
  }
  /**
    * @notice Set whether the contract is paused
    * @dev Only callable by owner
    *
    * @param newStatus bool New status of contractPaused
    */
  function setPausedStatus(bool newStatus) external onlyOwner {
    contractPaused = newStatus;
  }
  /**
    * @notice Destroy the Contract
    * @dev Only callable by owner and when contractPaused
    *
    * @param recipient address Recipient of any money in the contract
    */
  function killContract(address payable recipient) external onlyOwner paused {
    selfdestruct(recipient);
  }
  /**
    * @notice Gets the Stake Amount for a User
    * @param user address User who staked
    * @param signerToken address Signer token the user staked on
    * @param senderToken address Sender token the user staked on
    * @return uint256 Amount the user staked
    */
  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken
  ) external view returns (uint256) {
    // Ensure the index exists.
    require(indexes[signerToken][senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");
    // Return the score, equivalent to the stake amount.
    return indexes[signerToken][senderToken].getScore(user);
  }
  /**
    * @notice Get the locators of those trading a token pair
    * @dev Users are allowed to unstake from blacklisted indexes
    *
    * @param signerToken address Signer token of the trading pair
    * @param senderToken address Sender token of the trading pair
    * @param startAddress address Address to start from
    * @param count uint256 Total number of locators to return
    * @return locators bytes32[]
    */
  function getLocators(
    address signerToken,
    address senderToken,
    address startAddress,
    uint256 count
  ) external view notPaused returns (
    bytes32[] memory locators
  ) {
    // Ensure neither token is blacklisted.
    if (blacklist[signerToken] || blacklist[senderToken]) {
      return new bytes32[](0);
    }
    // Ensure the index exists.
    if (indexes[signerToken][senderToken] == Index(0)) {
      return new bytes32[](0);
    }
    // Return an array of locators for the index.
    return indexes[signerToken][senderToken].getLocators(startAddress, count);
  }
  /**
    * @notice Unset intents and return staked tokens
    * @param user address Address of the user who staked
    * @param signerToken address Signer token of the trading pair
    * @param senderToken address Sender token of the trading pair
    */
  function _unsetIntent(
    address user,
    address signerToken,
    address senderToken
  ) internal {
    // Ensure the index exists.
    require(indexes[signerToken][senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");
     // Get the score for the user.
    uint256 score = indexes[signerToken][senderToken].getScore(user);
    // Unset the locator on the index.
    indexes[signerToken][senderToken].unsetLocator(user);
    if (score > 0) {
      // Return the staked tokens. Reverts on failure.
      require(stakingToken.transfer(user, score));
    }
    emit Unstake(user, signerToken, senderToken, score);
  }
}

