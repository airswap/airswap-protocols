# Indexer

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for an `Indexer` used to manage intents to trade.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

#### :bulb: TODO

- Consider adding a filter to `getIntents` to for example select only one kind of locator.

## Features

### Peer Discovery

Find peers based on an intent to trade a specific token pair.

### Token Staking

Stake variable amounts of token to position intent in a market.

### Blacklisting

Duplicate or malicious tokens may be blacklisted.

## Definitions

| Term    | Definition                                                              |
| :------ | :---------------------------------------------------------------------- |
| Intent  | An interest in trading a specific token pair without price information. |
| Indexer | A data store of intents to trade on the AirSwap Network.                |
| Market  | A list of intents to trade for a token pair.                            |
| Locator | How a peer can be reached to communicate pricing.                       |

## Constructor

Create a new `Indexer` contract.

```Solidity
constructor(
  address _stakeToken
) public
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_stakeToken` | `address` | Address of the token required for staking. |

## Create a Market

If none exists, deploy a new `Market` contract for the given token pair and return the address of the new or existing market. For example, an intent to trade WETH/DAI.

```Solidity
function createMarket(
  address _makerToken,
  address _takerToken
) public returns (address)
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |

## Create a Two-Sided Market

Call `createMarket` twice to for both sides of a market. For example, an intent to trade both WETH/DAI and DAI/WETH.

```Solidity
function createTwoSidedMarket(
  address _tokenOne,
  address _tokenTwo
) public returns (address, address)
```

### Params

| Name        | Type      | Description                                            |
| :---------- | :-------- | :----------------------------------------------------- |
| `_tokenOne` | `address` | Address of the token of the first side of the market.  |
| `_tokenTwo` | `address` | Address of the token of the second side of the market. |

## Add a Token to Blacklist

Add a token to the blacklist. Markets that include the blacklisted token will be ignored. Emits an `AddToBlacklist` event.

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
```

### Params

| Name     | Type      | Description                         |
| :------- | :-------- | :---------------------------------- |
| `_token` | `address` | The address of the token to remove. |

## Set an Intent to Trade

Stake tokens to the Indexer and set an intent to trade.

```Solidity
function setIntent(
  address _makerToken,
  address _takerToken,
  uint256 _amount,
  uint256 _expiry,
  address _locator
) public
```

### Params

| Name          | Type      | Description                                  |
| :------------ | :-------- | :------------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends.   |
| `_takerToken` | `address` | Address of the token that the Taker sends.   |
| `_amount`     | `uint256` | Amount of token to stake.                    |
| `_expiry`     | `uint256` | Timestamp after which the intent is invalid. |
| `_locator`    | `address` | Locator for the peer.                        |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |
| `MINIMUM_NOT_MET`       | The staking amount is insufficient.        |
| `UNABLE_TO_STAKE`       | The staking amount was not transferred.    |

## Set a Two-Sided Intent to Trade

Call `setIntent` for both sides of a market.

```Solidity
function setTwoSidedIntent(
  address _tokenOne,
  address _tokenTwo,
  uint256 _amount,
  uint256 _expiry,
  address _locator
) public
```

### Params

| Name        | Type      | Description                                            |
| :---------- | :-------- | :----------------------------------------------------- |
| `_tokenOne` | `address` | Address of the token of the first side of the market.  |
| `_tokenTwo` | `address` | Address of the token of the second side of the market. |
| `_amount`   | `uint256` | Amount of token to stake for EACH market.              |
| `_expiry`   | `uint256` | Timestamp after which the intent is invalid.           |
| `_locator`  | `address` | Locator for the peer.                                  |

## Unset an Intent to Trade

Unset an intent to trade and return staked tokens to the sender.

```Solidity
function unsetIntent(
  address _makerToken,
  address _takerToken
) public
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |

## Unset a Two-Sided Intent to Trade

Call `unsetIntent` for both sides of a market.

```Solidity
function setTwoSidedIntent(
  address _tokenOne,
  address _tokenTwo
) public
```

### Params

| Name        | Type      | Description                                            |
| :---------- | :-------- | :----------------------------------------------------- |
| `_tokenOne` | `address` | Address of the token of the first side of the market.  |
| `_tokenTwo` | `address` | Address of the token of the second side of the market. |
| `_amount`   | `uint256` | Amount of token to stake for each side.                |
| `_expiry`   | `uint256` | Timestamp after which the intent is invalid.           |
| `_locator`  | `address` | Locator for the peer.                                  |

## Get Intents

Get a list of addresses that have an intent to trade a token pair.

```Solidity
function getIntents(
  address _makerToken,
  address _takerToken,
  uint256 count
) external view returns (address[] memory)
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |
| `_count`      | `uint256` | Maximum number of items to return.         |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |

## Get Length

Get the length of the list of intents for a token pair.

```Solidity
function lengthOf(
  address _makerToken,
  address _takerToken
) external view returns (uint256)
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |

### Reverts

| Reason                  | Scenario                               |
| :---------------------- | :------------------------------------- |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair. |
