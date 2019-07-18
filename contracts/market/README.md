# Market

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a `Market` that represents a list of intents to trade.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

#### :bulb: TODO

- Decide the features of `expiry` and add tests.

## Features

### Sorting

Intents are sorted by their score in descending order.

### Expiration

Intents that have expired are ignored when fetching.

## Definitions

| Term    | Definition                                                              |
| :------ | :---------------------------------------------------------------------- |
| Intent  | An interest in trading a specific token pair without price information. |
| Market  | A list of intents to trade for a token pair.                            |
| Locator | How a peer can be reached to communicate pricing.                       |

## Intent Struct

An "intent to trade" is represented by the following `Intent` struct.

```
struct Intent {
  address holder;
  uint256 score;
  uint256 expiry;
  bytes32 locator;
}
```

## Locators

Locators are bytes32 values that indicate where a peer can be found to communicate pricing. The last byte is either a value of `1`, `2`, or `3` to indicate the kind of peer.

| Value | Kind                                                                                                 |
| :---- | :--------------------------------------------------------------------------------------------------- |
| `1`   | Ethereum address, length 20 characters, representing a `Delegate` smart contract.                    |
| `2`   | Ethereum address, length 20 characters, reachable on [AirSwap Instant](https://instant.airswap.io/). |
| `3`   | Uniform resource locator (URL) max length 31 characters.                                             |

## Constructor

Create a new `Market` contract. Usually called within the context of an `Indexer` contract.

```Solidity
constructor (
  address _makerToken,
  address _takerToken
) public
```

### Params

| Name          | Type      | Description                                              |
| :------------ | :-------- | :------------------------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker is intended to send. |
| `_takerToken` | `address` | Address of the token that the Taker is intended to send. |

## Set an Intent

Set an intent to trade in the Market.

```Solidity
function setIntent(
  address _holder,
  uint256 _score,
  uint256 _expiry,
  bytes32 _locator
) external
```

### Params

| Name       | Type      | Description                                            |
| :--------- | :-------- | :----------------------------------------------------- |
| `_holder`  | `address` | Address of the account that has staked for the intent. |
| `_score`  | `uint256` | score of token that the account has staked.           |
| `_expiry`  | `uint256` | Expiry of the intent as a timestamp in seconds.        |
| `_locator` | `bytes32` | Locator for the peer.                                  |

## Unset an Intent

Unset an intent to trade in the Market.

```Solidity
function unsetIntent(
  address _holder
) public returns (bool)
```

### Params

| Name      | Type      | Description                                          |
| :-------- | :-------- | :--------------------------------------------------- |
| `_holder` | `address` | Address of the account that will unstake its intent. |

## Get an Intent

Gets the intent for a given holder address.

```Solidity
function getIntent(
  address _holder
) public view returns (Intent memory)
```

### Params

| Name      | Type      | Description                                |
| :-------- | :-------- | :----------------------------------------- |
| `_holder` | `address` | Address of the account to fetch an intent. |

## Has an Intent

Determines whether the Market has an intent for a holder address.

```Solidity
function hasIntent(
  address _holder
) internal view returns (bool)
```

### Params

| Name      | Type      | Description                                |
| :-------- | :-------- | :----------------------------------------- |
| `_holder` | `address` | Address of the account to check an intent. |

## Fetch Intents

Fetch up to a number of intents from the list.

```Solidity
function fetchIntents(
  uint256 _count
) public view returns (bytes32[] memory result)
```

### Params

| Name     | Type      | Description                 |
| :------- | :-------- | :-------------------------- |
| `_count` | `uint256` | Number of intents to fetch. |

## Find an Intent (By Value)

Find an intent by value in the list.

```Solidity
function findPosition(
  uint256 score
) internal view returns (Intent memory)
```

### Params

| Name     | Type      | Description                 |
| :------- | :-------- | :-------------------------- |
| `_count` | `uint256` | Number of intents to fetch. |

## Insert an Intent

Insert a new intent in the list, before the specified `_nextIntent`.

```Solidity
function insertIntent(
  Intent memory _newIntent,
  Intent memory _nextIntent
) internal returns (bool)
```

### Params

| Name        | Type     | Description                         |
| :---------- | :------- | :---------------------------------- |
| `_newIntent`   | `Intent` | Intent to insert.                |
| `_nextIntent` | `Intent` | Existing intent to insert before. |

## Link Two Intents

Link two intents in the list.

```Solidity
function link(
  Intent memory _left,
  Intent memory _right
) internal
```

### Params

| Name     | Type     | Description                                    |
| :------- | :------- | :--------------------------------------------- |
| `_left`  | `Intent` | The intent to link to the left (Higher value). |
| `_right` | `Intent` | The intent to link to the right (Lower value). |
