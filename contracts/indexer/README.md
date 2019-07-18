# Indexer

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for an `Indexer` used to manage intents to trade.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

#### :bulb: TODO

- Consider adding a filter to `getIntents` to for example select only one kind of locator.

## Features

### Peer Discovery

Find peers based on an intent to trade a specific token pair.

### Token Staking

Stake variable amounts of token for variable lengths of time.

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
  address _stakeToken,
  uint256 _stakeMinimum,
  uint256 _stakePeriodLength
) public
```

### Params

| Name                 | Type      | Description                                |
| :------------------- | :-------- | :----------------------------------------- |
| `_stakeToken`        | `address` | Address of the token required for staking. |
| `_stakeMinimum`      | `uint256` | Minimum amount of token required to stake. |
| `_stakePeriodLength` | `uint256` | Length in seconds of a stake period.       |

## Create a Market

Deploy a new `Market` for the given token pair.

```Solidity
function createMarket(
  address _makerToken,
  address _takerToken
) external
```

### Params

| Name          | Type      | Description                                |
| :------------ | :-------- | :----------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends. |
| `_takerToken` | `address` | Address of the token that the Taker sends. |

### Reverts

| Reason                  | Scenario                                      |
| :---------------------- | :-------------------------------------------- |
| `MARKET_ALREADY_EXISTS` | There is already a market for the token pair. |

## Set the Stake Minimum

Set the minimum amount of tokens required to set an intent to trade.

```Solidity
function setStakeMinimum(
  uint256 _stakeMinimum
) external onlyOwner
```

### Params

| Name            | Type      | Description                                |
| :-------------- | :-------- | :----------------------------------------- |
| `_stakeMinimum` | `uint256` | Minimum amount of token required to stake. |

## Set the Stake Period

Set the length of each stake period in seconds.

```Solidity
function setStakePeriodLength(
  uint256 _stakePeriodLength
) external onlyOwner
```

### Reverts

| Reason                         | Scenario                  |
| :----------------------------- | :------------------------ |
| `PERIOD_LENGTH_CANNOT_BE_ZERO` | The value provided was 0. |

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
  uint256 _periods,
  bytes32 _locator
) external
```

### Params

| Name          | Type      | Description                                  |
| :------------ | :-------- | :------------------------------------------- |
| `_makerToken` | `address` | Address of the token that the Maker sends.   |
| `_takerToken` | `address` | Address of the token that the Taker sends.   |
| `_amount`     | `uint256` | Amount of token to stake.                    |
| `_periods`    | `uint256` | Number of periods to hold the Intent.        |
| `_locator`    | `bytes32` | Locator for the peer.                        |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |
| `MINIMUM_NOT_MET`       | The staking amount is insufficient.        |
| `UNABLE_TO_STAKE`       | The staking amount was not transferred.    |

## Unset an Intent to Trade

Unset an intent to trade and return staked tokens to the sender.

```Solidity
function unsetIntent(
  address _makerToken,
  address _takerToken
) external
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

## Get Intents

Get a list of intents to trade.

```Solidity
function getIntents(
  address _makerToken,
  address _takerToken,
  uint256 count
) external view returns (
  bool available,
  bytes32[] memory locators
)
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
) external view returns (
  bool available,
  uint256 length
)
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

## Locators

An intent to trade includes a `Locator` stored as byte32. The last byte is the kind of the Locator.

### Kinds

| Value | Kind     | Description                                                                       |
| :---- | :------- | :-------------------------------------------------------------------------------- |
| `1`   | CONTRACT | Ethereum address, length 20 characters, representing a `Delegate` smart contract. |
| `2`   | INSTANT  | Ethereum address, length 20 characters, reachable on AirSwap Instant.             |
| `3`   | URL      | Uniform resource locator (URL) max length 31 characters.                          |

## Examples

### Delegate Contract

Alice has deployed a `Delegate` contract to address `0x8a56f218f7113f09bb4155ed8283bbca9d2ccb74`. She serializes her intent to trade at that address using the `indexer-utils` package.

```
const { intents } = require('@airswap/indexer-utils')
const locator = intents.serialize(
  intents.Locators.ETH,
  '0x8a56f218f7113f09bb4155ed8283bbca9d2ccb74'
)
// Looks like: 0x8a56f218f7113f09bb4155ed8283bbca9d2ccb74000000000000000000000001
```

She then sets her intent passing the `locator` value.

### Instant Maker

Bob runs a maker connected to AirSwap Instant with address `0x06eb4aa8a6fa0b1d893581d30cf653d1835fb2b9`. He serializes his intent to trade at that address using the `indexer-utils` package.

```
const { intents } = require('@airswap/indexer-utils')
const locator = intents.serialize(
  intents.Locators.INSTANT,
  '0x06eb4aa8a6fa0b1d893581d30cf653d1835fb2b9'
)
// Looks like: 0x06eb4aa8a6fa0b1d893581d30cf653d1835fb2b9000000000000000000000002
```

He then sets his intent passing the `locator` value.

### Arbitrary

Carol runs a Maker on an HTTP-RPC endpoint on the public internet at `https://rpc.maker-cloud.io`. She serializes her intent to trade at that address using the `indexer-utils` package.

```
const { intents } = require('@airswap/indexer-utils')
const locator = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io'
)
// Looks like: 0x68747470733a2f2f7270632e6d616b65722d636c6f75642e696f00000000003
```

She then sets her intent passing the `locator` value.
