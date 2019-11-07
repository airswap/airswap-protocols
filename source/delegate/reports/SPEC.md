# Report: Delegate

Hash of master used for report: [b87d292aaf6e28ede564b7ea28ece39219994607](https://github.com/airswap/airswap-protocols/commit/b87d292aaf6e28ede564b7ea28ece39219994607)

Delegate [Source Code](https://github.com/airswap/airswap-protocols/tree/master/source/delegate) and [README](../README.md)

## Introduction

The Swap Protocol is a peer-to-peer protocol for trading Ethereum tokens that allows two parties to exchange tokens in an atomic transaction. The Delegate serves as an on-chain maker which allows one to set trading rules and allow others to send orders to it that will be filled by Swap. Delegate can be deployed by the DelegateFactory. The contracts are compiled with 0.5.12+commit.7709ece9 (0.5.12 stable release).

## Structure

Delegate is comprised of several contracts.

[@airswap/delegate/contracts/interfacts/IDelegate.sol](../contracts/IDelegate.sol) @ [b87d292aaf6e28ede564b7ea28ece39219994607](https://github.com/airswap/airswap-protocols/commit/b87d292aaf6e28ede564b7ea28ece39219994607)

[@airswap/indexer/contracts/interfacts/IIndexer.sol](../contracts/IIndexer.sol) @ [b87d292aaf6e28ede564b7ea28ece39219994607](https://github.com/airswap/airswap-protocols/commit/b87d292aaf6e28ede564b7ea28ece39219994607)

[@airswap/swap/contracts/interfaces/ISwap.sol](../contracts/ISwap.sol) @ [b87d292aaf6e28ede564b7ea28ece39219994607](https://github.com/airswap/airswap-protocols/commit/b87d292aaf6e28ede564b7ea28ece39219994607)

Deployment of Delegate.sol is performed in the `@airswap/delegatefacotry` package in the `airswap-protocols` monorepo. The Factory creates and stores the addresses of these Delegates.

## Dependencies

[Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

_Externally Audited Files from the OpenZeppelin library (v2.3)_

```
Ownable.sol
SafeMath
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

#### Public or external functions (non-getter functions)

| Function            | Source      | Visibility | Params                                                                          | Payable |
| :------------------ | :---------- | :--------- | :------------------------------------------------------------------------------ | :------ |
| setRule         | Delegate.sol | external   | `address senderToken, address signerToken, uint256 maxSenderAmount, uint256 priceCoef, uint256 priceExp`                                    | no      |
| unsetRule      | Delegate.sol | external   | `address senderToken, address signerToken`                                                    | no      |
| setRuleAndIntent | Delegate.sol | external   | `address senderToken, address signerToken, Rule calldata rule, uint256 amountToStake`                                                    | no      |
| unsetRuleAndIntent           | Delegate.sol | external   | `address signerToken, address senderToken, uint256 stakingAmount, bytes32 locator` | no      |
| provideOrder         | Delegate.sol | external   | `Types.Order calldata order`                                    | no      |
| setTradeWallet         | Delegate.sol | external   | `address newTradeWallet`                                    | no      |
| getSignerSideQuote         | Delegate.sol | external   | `uint256 senderParam, address senderToken, address signerToken`                                    | no      |
| getSenderSideQuote         | Delegate.sol | external   | `uint256 signerParam, address signerToken, address senderToken`                                    | no      |
|getMaxQuote | Delegate.sol | external | `address senderToken, address signerToken` | no |


## Invariants


## Analysis

#### Slither (static analyzer)

TODO

## Testing

#### Unit and Integration Tests

```
source/delegate/test/Delegate-unit.js
source/delegate/test/Delegate.js
```

#### Test Coverage

100% coverage between unit and integration tests.


-----------------------|----------|----------|----------|----------|----------------|
File                   |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------|----------|----------|----------|----------|----------------|
 contracts/            |      100 |      100 |      100 |      100 |                |
  Delegate.sol         |      100 |      100 |      100 |      100 |                |
  Imports.sol          |      100 |      100 |      100 |      100 |                |
 contracts/interfaces/ |      100 |      100 |      100 |      100 |                |
  IDelegate.sol        |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|
All files              |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|

## Migrations

N/A

## Notes

- Because of two issues found with ABIEncoderV2, we ensured that the newest version of the Solidity compiler was used where those issues were resolved. More information can be found at the [Ethereum Foundation blog](https://blog.ethereum.org/2019/03/26/solidity-optimizer-and-abiencoderv2-bug/).
- Smart contracts are a nascent space, and no perfect security audit procedure has thus far been perfected for their deployment. We welcome any suggestions or comments on this report, its contents, our methodology, or potential gaps in coverage.