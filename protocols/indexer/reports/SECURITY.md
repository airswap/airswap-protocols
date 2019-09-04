# Security Report: Indexer

Smart Contract Security Report by Team Fluidity (team[at]fluidity[dot]io) and Phil Daian (feedback[at]stableset[dot]com)
Hash of master used for report: [ef5cff0613532d27ecedb332e222ae0a75079841](https://github.com/airswap/airswap-protocols/commit/ef5cff0613532d27ecedb332e222ae0a75079841)

Index [Source Code](https://github.com/airswap/airswap-protocols/tree/master/protocols/index) and [README](../README.md)

## Introduction

The Swap Protocol is a peer-to-peer protocol for trading Ethereum tokens that allows two parties to exchange tokens in an atomic transaction. The Indexer serves as an on-chain, decentralized indexing service for participants sharing their intent to trade with one another on the AirSwap protocol. Participants of the system can choose to stake certain token amounts to make their intents more visible. The staked token is initialized when deploying the Indexer onto the network. The Indexer is comprised of several smart contracts. The contracts are compiled with v0.5.10.a6ea5b19 (0.5.10 stable release).


## Structure

Indexer is comprised of several contracts.

[@airswap/index/contracts/interfaces/ILocatorWhitelist.sol](../contracts/ILocatorWhitelist.sol) @ [2518c58bec77b8b7d7791d225de9f22716294e77](https://github.com/airswap/airswap-protocols/commit/2518c58bec77b8b7d7791d225de9f22716294e77)

[@airswap/index/contracts/interfacts/IIndexer.sol](../contracts/IIndexer.sol) @ [2518c58bec77b8b7d7791d225de9f22716294e77](https://github.com/airswap/airswap-protocols/commit/2518c58bec77b8b7d7791d225de9f22716294e77)

[@airswap/index/contracts/Index.sol](../contracts/Index.sol) @ [2518c58bec77b8b7d7791d225de9f22716294e77](https://github.com/airswap/airswap-protocols/commit/2518c58bec77b8b7d7791d225de9f22716294e77)

[@airswap/index/contracts/Indexer.sol](../contracts/Indexer.sol) @ [2518c58bec77b8b7d7791d225de9f22716294e77](https://github.com/airswap/airswap-protocols/commit/2518c58bec77b8b7d7791d225de9f22716294e77)

Deployment of Indexer.sol was performed in the `@airswap/indexer` package in the `airswap-protocols` monorepo.

## Dependencies

[Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

_Externally Audited Files from the OpenZeppelin library (v2.2)_

```
Ownable.sol
IERC20.sol
```

_Externally Audited files from OpenZeppelin library used solely for tests_

```
ERC20Mintable.sol
```

## Contracts

```
Index.sol
** Ownable.sol
```

_\*\* OpenZeppelin contract_

#### Public and external functions (non-getter functions)

| Function    | Source      | Visibility | Params                                                             | Payable |
| :-------    | :---------- | :--------- | :----------------------------------------------------------------- | :------ |
| createIndex  | Indexer.sol   | external   | `address _makerToken, address _takerToken`                      | no      |
| addToBlacklist| Indexer.sol   | external   | `address[] calldata _tokens`                                   | no      |
| removeFromBlacklist| Indexer.sol   | external   | `address[] calldata _tokens`                                   | no      |
| setIntent| Indexer.sol   | external   | `address _makerToken, address _takerToken, uint256 _amount, bytes32 _locator` | no      |
| unsetIntent| Indexer.sol   | external   | ``address _makerToken, address _takerToken``                                   | no      |

## Invariants

#### 1. No ether is ever held by the contract address.

- No functions are payable and thus stuck ether due to improper function calls is not possible.

- Although self-destruct can forcefully send money to any non-payable contract; this is out of scope of review, and because this.balance is not used in the code, cannot lead to security issues.
- **This invariant currently holds as-is.**

#### 2. Only the owner is able to modify the blacklist.
- By inspection it can be seen that only 2 functions modify the blacklist: addToBlacklist() and removeFromBlacklist()
- Both of these functions have the onlyOwner modifier, as defined in Ownable.sol
- **This invariant currently holds as-is.**

#### 3. Anyone can create a new index.
- By inspection, `new Index(...)` is found within one function of the Indexer. Namely `Indexer.createIndex(...)`.
- This function is external, and at no point does it query `msg.sender` to see who called the function.
- It is therefore apparently than anyone can call Indexer.createIndex and create a new Index.
- **This invariant currently holds as-is.**

#### 4. The Indexer is always the owner of all the Index contracts in the indexes mapping.
This breaks down into 2 sub invariants:
- An index can not be created outside the indexer and then put into the mapping
    - Only 1 line of the contract ever edits the content of the indexes mapping.
    - This line is in the createIndex function, and sets a location in the mapping to the address of a Index contract that is created on the same line.
    - It is therefore impossible to get a pre-created Index address into the mapping.
    - **This invariant currently holds as-is.**
- Index contracts created inside the indexer are owned by the indexer, and ownership cannot be transferred elsewhere.
    - On creation of new Index contracts in createIndex(), the Indexer owns the Index (by the definition of OpenZeppelin’s Ownable contract)
    - The only way to transfer ownership of an Index is to call the function Index.transferOwnership(...). This function is never called in any function of the Indexer contract.
    - **This invariant currently holds as-is.**

#### 5. Index contracts including a blacklisted token cannot have new intents set
- `Index.setLocator` is only invoked at one place in the contract: at the end of `Indexer.setIntent`.
- A require statement at the beginning of this function causes the call to revert if either or both of the tokens in the index has a value of `true` in the blacklist mapping.
- This therefore means that `Index.setLocator` is never called for a token that is blacklisted at that time.
- **This invariant currently holds as-is.**

#### 6. Intents can be unset for a index containing blacklisted tokens.
- Index.unsetLocator is only invoked at one place in the contract: at the end of Indexer.unsetIntent.
- Indexer.unsetIntent never utilises the blacklist mapping for anything, meaning the blacklist state of tokens is unchecked and does not influence the function
- Intents can therefore be unset for blacklisted and unblacklisted indexes alike.
- **This invariant currently holds as-is.**

#### 7. When an intent is set, `amount` tokens are always staked
- Index.setLocator is only invoked at one place in the contract: at the end of Indexer.setIntent.
- In the case where amount == 0, the if statement is bypassed, and no interaction with the staking token occurs.
- In the case where amount > 0, the if statement is executed, and `amount` of tokens are staked. If this staking fails the entire intent setting is reverted.
- The case where amount < 0 does not exist, as amount is an unsigned integer.
- Therefore in all cases `amount` tokens are staked
- **This invariant currently holds as-is.**

#### 8. Staked tokens are owned by the Indexer contract
- When an intent is being set, stake tokens are transferred to address(this) - meaning they are transferred to the Indexer contract.
- Aside from this staking, there is only one other line of the indexer contract that transfers staking tokens.
-This line is in the unsetIntent function, and is a transfer of tokens from the Indexer contract to whoever the function caller is.
`unsetIntents` previously checks that the function caller has an intent on the specified index, then removes the intent and transfers them the specified number of tokens.
-This transfer is therefore always an unstaking action, and the Indexer always owns all staked tokens.
- **This invariant currently holds as-is.**

#### 9. Only one set of staked tokens is taken from the staker on intent setting
- When setIntent is called with a non-zero amount, tokens are transfer exactly onced. Duplicate calls to this function will fail as duplicate indexes cannot be created.
- **This invariant currently holds as-is.**

#### 10. Return of staking tokens to staker occurs if, and only if, their intent is being unset
This breaks down into 2 sub invariants:
- Whenever an intent is unset, the relevant staking tokens are returned.
    - `Index.unsetLocator` is only called from `Indexer.unsetIntent`, meaning that intents only get unset in one way.
    - Immediately after this function call to the `Index` occurs, `Indexer.unsetIntent` checks the number of tokens that had been staked for the intent and, if any, transfers these back to the staker.
    - `IERC20.transfer` does not have to revert if the transfer fails, it only has to return false by definition. We therefore catch this case in a require statement meaning that whenever the unstaking fails, the entire transaction reverts and the intent is not unset.
    - **This invariant currently holds as-is.**
- If staking tokens get returned, the relevant intent is unset.
    - As outlined in (8), all staked tokens are owned by the Indexer.
    - There is only one location in the contract where tokens are transferred out of the Indexer contract, therefore meaning this is the only location where unstaking occurs - in  `Indexer.unsetIntent`.
    - The address that these tokens are being sent to is the address calling the function. This address is used to look up the same address’ intent on the index, and the intent is unset.
    - **This invariant currently holds as-is.**

#### 11. The contract owns staking tokens (greater than or) equal to the sum of the `amount` staked on each intent.
- Through the invariants 7, 8 and 10, we know that the contract receives `amount` tokens on setting of an intent, and when this is unset the tokens are unstaked.
- We therefore know that at any given time the Indexer owns all of the staked tokens.
- It is possible for people to give ownership of more staking tokens to the Indexer contract address, however these cannot be withdrawn, as the only way the Indexer transfers staking tokens is on an unstaking.
- **This invariant currently holds as-is.**


## Analysis

#### Slither (static analyzer)

TODO

## Testing

#### Unit and Integration Tests

```
protocols/indexer/test/Indexer-unit.js
protocols/indexer/test/Indexer.js
```

#### Test Coverage

100% coverage between unit and integration tests.

------------------------|----------|----------|----------|----------|----------------|
File                    |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------------|----------|----------|----------|----------|----------------|
 contracts/             |      100 |      100 |      100 |      100 |                |
  Indexer.sol           |      100 |      100 |      100 |      100 |                |
 contracts/interfaces/  |      100 |      100 |      100 |      100 |                |
  IIndexer.sol          |      100 |      100 |      100 |      100 |                |
------------------------|----------|----------|----------|----------|----------------|
All files               |      100 |      100 |      100 |      100 |                |
------------------------|----------|----------|----------|----------|----------------|

## Migrations
 N/A

## Notes

- Because of two issues found with ABIEncoderV2, we ensured that the newest version of the Solidity compiler was used where those issues were resolved. More information can be found at the [Ethereum Foundation blog](https://blog.ethereum.org/2019/03/26/solidity-optimizer-and-abiencoderv2-bug/).
- Smart contracts are a nascent space, and no perfect security audit procedure has thus far been perfected for their deployment. We welcome any suggestions or comments on this report, its contents, our methodology, or potential gaps in coverage.
