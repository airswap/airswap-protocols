# Indexer

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for an `Indexer` used to manage intents to trade.

:bulb: **Note**: `solidity-coverage` does not cooperate with `view` functions. To run test coverage, remove the `view` keywords from functions in `Indexer.sol`, `IIndexer.sol`, and `ILocatorWhitelist.sol`.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://airswap.gitbook.io/
- Website → https://www.airswap.io/
- Blog → https://medium.com/fluidity
- Support → https://support.airswap.io/

## Commands

| Command         | Description                                   |
| :-------------- | :-------------------------------------------- |
| `yarn`          | Install dependencies                          |
| `yarn clean`    | Delete the contract `build` folder            |
| `yarn compile`  | Compile all contracts to `build` folder       |
| `yarn coverage` | Run solidity-coverage to report test coverage |
| `yarn ganache`  | Run an instance of `ganache-cli` for tests    |
| `yarn hint`     | Run a syntax linter for all Solidity code     |
| `yarn lint`     | Run a syntax linter for all JavaScript code   |
| `yarn test`     | Run all contract tests in `test` folder       |

## Running Tests

Run an instance of `ganache-cli` before running tests.

<<<<<<< HEAD
Duplicate or malicious tokens may be blacklisted.

### Locator Whitelisting

Limit locators to those whitelisted by another contract.

## Definitions

| Term    | Definition                                                              |
| :------ | :---------------------------------------------------------------------- |
| Entry  | An interest in trading a specific token pair without price information. |
| Indexer | A data store of intents to trade on the AirSwap Network.                |
| Index  | A list of intents to trade for a token pair.                            |
| Locator | How a peer can be reached to communicate pricing.                       |

## Constructor

Create a new `Indexer` contract.

```Solidity
constructor(
  address _stakeToken
  address _locatorWhitelist
) public
```

### Params

| Name                | Type      | Description                                        |
| :------------------ | :-------- | :------------------------------------------------- |
| `_stakeToken`       | `address` | Address of the token required for staking.         |
| `_locatorWhitelist` | `address` | Address of an optional locator whitelist contract. |

## Create a Index

If none exists, deploy a new `Index` contract for the given token pair and return the address of the new or existing index contract. For example, an entry to trade WETH/DAI.

```Solidity
function createIndex(
  address _makerToken,
  address _takerToken
) public returns (address)
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |

## Add a Token to Blacklist

Add a token to the blacklist. Index contracts that include the blacklisted token will be ignored. Emits an `AddToBlacklist` event.

```Solidity
function addToBlacklist(
  address _token
) external onlyOwner
```

### Params

| Name     | Type      | Description                        |
| :------- | :-------- | :--------------------------------- |
| `_token` | `address` | Address of the token to blacklist. |

## Remove a Token from Blacklist

Remove a token from the blacklist. Emits a `RemoveFromBlacklist` event.

```Solidity
function removeFromBlacklist(
  address _token
) external onlyOwner
=======
>>>>>>> 4bca549250eca8420e990a3ff0bcb14425fafb53
```
yarn ganache
```
