# Index

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a `Index` that represents a list of intents to trade.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

### Sorting

Intents are sorted by their amount, with the largest amount at the beginning of the list. Currently the staking amount is indicated by an Indexer that owns the Index.

## Definitions

| Term    | Definition                                                              |
| :------ | :---------------------------------------------------------------------- |
| Intent  | An interest in trading a specific token pair without price information. |
| Index  | A list of intents to trade for a token pair.                            |
| Locator | How a peer can be reached to communicate pricing.                       |

## Intent Struct

An "intent to trade" is represented by the following `Intent` struct.

```
struct Intent {
  address staker;
  uint256 amount;
  address locator;
}
```

## Constructor

Create a new `Index` contract. Usually called within the context of an `Indexer` contract.

```Solidity
constructor(
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

Set an intent to trade in the Index.

```Solidity
function setIntent(
  address _staker,
  uint256 _amount,
  address _locator
) external onlyOwner
```

### Params

| Name       | Type      | Description                                            |
| :--------- | :-------- | :----------------------------------------------------- |
| `_staker`  | `address` | Address of the account that has staked for the intent. |
| `_amount`  | `uint256` | Amount of token that the account has staked.           |
| `_locator` | `address` | Locator for the peer.                                  |

## Unset an Intent

Unset an intent to trade in the Index.

```Solidity
function unsetIntent(
  address _staker
) public onlyOwner returns (bool)
```

### Params

| Name      | Type      | Description                                          |
| :-------- | :-------- | :--------------------------------------------------- |
| `_staker` | `address` | Address of the account that will unstake its intent. |

## Get an Intent

Gets the intent for a given staker address.

```Solidity
function getIntent(
  address _staker
) public view returns (Intent memory)
```

### Params

| Name      | Type      | Description                               |
| :-------- | :-------- | :---------------------------------------- |
| `_staker` | `address` | Address of the account to fetch an intent |

## Has an Intent

Determines whether the Index has an intent for a staker address.

```Solidity
function hasIntent(
  address _staker
) internal view returns (bool)
```

### Params

| Name      | Type      | Description                               |
| :-------- | :-------- | :---------------------------------------- |
| `_staker` | `address` | Address of the account to check an intent |

## Fetch Intents

Fetch up to a number of intents from the list.

```Solidity
function fetchIntents(
  uint256 _count
) public view returns (address[] memory result)
```

### Params

| Name     | Type      | Description                 |
| :------- | :-------- | :-------------------------- |
| `_count` | `uint256` | Number of intents to fetch. |

## Find an Intent (By Value)

Find an intent by value in the list.

```Solidity
function findPosition(
  uint256 amount
) internal view returns (Intent memory)
```

### Params

| Name     | Type      | Description                 |
| :------- | :-------- | :-------------------------- |
| `_count` | `uint256` | Number of intents to fetch. |

## Insert an Intent

Insert an intent before an existing intent in the list.

```Solidity
function insertIntent(
  Intent memory _newIntent,
  Intent memory _nextIntent
) internal returns (bool)
```

### Params

| Name          | Type     | Description                       |
| :------------ | :------- | :-------------------------------- |
| `_newIntent`  | `Intent` | Intent to insert.                 |
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
