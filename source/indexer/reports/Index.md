# Security Report: Index

Smart Contract Security Report by Team Fluidity (team[at]fluidity[dot]io) and Phil Daian (feedback[at]stableset[dot]com)
Hash of master used for report: [ef5cff0613532d27ecedb332e222ae0a75079841](https://github.com/airswap/airswap-protocols/commit/ef5cff0613532d27ecedb332e222ae0a75079841)

Index [Source Code](https://github.com/airswap/airswap-protocols/tree/master/source/index) and [README](../README.md)

## Introduction

The Swap Protocol is a peer-to-peer protocol for trading Ethereum tokens that allows two parties to exchange tokens in an atomic transaction.The Index contract is an accessory contract that stores a (linked) list of Locator structs. It houses functions to update the list as well as enforces role-based access controls. It fits into the AirSwap ecosystem as being the storage structure for the Indexer which is the on-chain contract that allows on-chain peers to post their choice token-pairs. The Index contract remains independent of the staking and token logic found within the Indexer. The contract is compiled with v0.5.10.a6ea5b19 (0.5.10 stable release).

## Structure

Index is comprised of a single contract.

[@airswap/index/contracts/Index.sol](../contracts/Index.sol) @ [2518c58bec77b8b7d7791d225de9f22716294e77](https://github.com/airswap/airswap-protocols/commit/2518c58bec77b8b7d7791d225de9f22716294e77)

Deployment of Index.sol was performed in the `@airswap/index` package in the `airswap-protocols` monorepo.

## Dependencies

[Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

_Externally Audited Files from the OpenZeppelin library (v2.2)_

```
Ownable.sol
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

| Function     | Source      | Visibility   | Params                                                             | Payable |
| :-------     | :---------- | :----------- | :----------------------------------------------------------------- | :------ |
| setLocator   | Index.sol   | external     | `address _user, uint256 _score, bytes32 _data`                     | no      |
| unsetLocator | Index.sol   | external     | `address _user`                                                    | no      |
| fetchLocators| Index.sol   | external view| `uint256 _count`                                                   | no      |

## Invariants

#### 1. No ether is ever held by the contract address.

- No functions are payable and thus stuck ether due to improper function calls is not possible.

- Although self-destruct can forcefully send money to any non-payable contract; this is out of scope of review, and because this.balance is not used in the code, cannot lead to security issues.

- **This invariant currently holds as-is.**

#### 2. The linked list of Locators may only be modified by the contract owner.

- The locatorsLinkedList is modified in 3 places in the contract. In all places, there is a modifier onlyOwner at the beginning:
    - First, the constructor. The caller of the constructor of the contract becomes the contract’s owner by definition of OpenZeppelin’s Ownable contract.
    - Second in unsetLocator. This function is marked as onlyOwner, meaning that it can only be called successfully by the contract's owner.
    - Third in setLocator. This function is marked as onlyOwner, meaning that it can only be called successfully by the contract's owner.
- **This invariant currently holds as-is.**


#### 3. Linked list ordering by score must be preserved at all times (Highest -> Lowest).

a. Inserting Locators preserves the ordering of the list.
By induction:
- Case where the list is empty:
    - There are no locators in the list and the list is merely the HEAD that points to itself (this is setup in the constructor).
    - The invariant is vacuously true for the base case
- Given a new Locator, we call setLocator
    - Assuming the new locator is a valid Locator.
        - set by the owner
        - has a user who has not previously set a Locator
    - The location to insert the new locator in is found using the function findPosition(score)
        - If its score is 0, the location for the new locator is the end of the list
        - Otherwise findPosition looks at the list of locators in decreasing score value, and returns the first score that is lower than the new score.
        - If there is an equal score, the new Locator is placed after the previous same-scored Locator.
    - This is guaranteed to happen, as all locators are in a fixed ordering, and HEAD has a score of 0, meaning if the new locator is the new tail of the list the HEAD will be returned.
    - The Locator is then inserted in its rightful position, and the list is still in descending order of score.
- **This invariant currently holds as-is.**
b. Removing locators preserves the ordering of the list
- Given a list starting with n > 0 locators in it, one locator, x, is removed by calling unsetLocator
unsetIntent first links together the element before and after x in the list so that they point to each other instead of to x
- The data stored in x’s pointers is then deleted, so that if it is looked up in future it is clear that this locator does not exist
- The edge case is when one of the ‘locators’ before or after x in the list is actually the head of the list (meaning x was first and/or last in the list).
- In this case, the head is simply linked to the new first/last element in the list, and the ordering is preserved.
- **This invariant currently holds as-is.**

#### 4. Each address can have either 0 or 1 locators on the index at any time - and therefore calling setLocator() twice does not disrupt the ordering of the locator linked list.

- When the contract is created, the list is initialised as empty, and therefore no Locators exist for any user addresses.
- When a new Locator is being set, if the address already has a Locator, the transaction reverts with LOCATOR_ALREADY_SET ensuring addresses cannot have more than 1 Locator on the index.
- **This invariant currently holds as-is.**

#### 5. Calling unsetLocator() twice does not disrupt ordering of the locator linked list.

- At the beginning of unsetLocator, the function checks whether the specified address actually has an address. If they do not, the function returns false and stops executing
- unsetLocator therefore only executes for addresses that have a Locator at that moment in time

- **This invariant currently holds as-is.**

#### 6. The length variable is always equal to the number of Locators on the locator linked list.
- Length is initialised as 0, and the list is initialised as empty
- Length is only edited in the functions setLocator and unsetLocator, directly after a new element has been added or removed respectively.
- If adding or removing an element fails in these functions, then the transaction will revert, and the length will not be updated.
- **This invariant currently holds as-is.**

## Analysis

#### Slither (static analyzer)

TODO

## Testing

#### Unit and Integration Tests

```
source/index/test/Index-unit.js
source/index/test/Index-test.js
```

#### Test Coverage

100% coverage between unit and integration tests.

|--------------|----------|----------|----------|----------|----------------|
|File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
|--------------|----------|----------|----------|----------|----------------|
| contracts/   |      100 |      100 |      100 |      100 |                |
|  Index.sol   |      100 |      100 |      100 |      100 |                |
|--------------|----------|----------|----------|----------|----------------|
|All files     |      100 |      100 |      100 |      100 |                |
|--------------|----------|----------|----------|----------|----------------|
## Migrations
 N/A

## Notes

- Because of two issues found with ABIEncoderV2, we ensured that the newest version of the Solidity compiler was used where those issues were resolved. More information can be found at the [Ethereum Foundation blog](https://blog.ethereum.org/2019/03/26/solidity-optimizer-and-abiencoderv2-bug/).
- Smart contracts are a nascent space, and no perfect security audit procedure has thus far been perfected for their deployment. We welcome any suggestions or comments on this report, its contents, our methodology, or potential gaps in coverage.