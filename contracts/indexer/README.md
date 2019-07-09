# Indexer

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains the AirSwap `Indexer` that Traders use to manage their "intent to trade" on the AirSwap Network.

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
  address _stakeToken,
  uint256 _stakeMinimum
) public
```

### Params

| Name            | Type      | Optionality | Description                                |
| :-------------- | :-------- | :---------- | :----------------------------------------- |
| `_stakeToken`   | `address` | Required    | Address of the token required for staking. |
| `_stakeMinimum` | `uint256` | Required    | Minimum amount of token required to stake. |

## Create a Market

Deploy a new `Market` for the given token pair.

```Solidity
function createMarket(
  address makerToken,
  address takerToken
) external
```

### Params

| Name         | Type      | Optionality | Description                                |
| :----------- | :-------- | :---------- | :----------------------------------------- |
| `makerToken` | `address` | Required    | Address of the token that the Maker sends. |
| `takerToken` | `address` | Required    | Address of the token that the Taker sends. |

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

| Name            | Type      | Optionality | Description                                |
| :-------------- | :-------- | :---------- | :----------------------------------------- |
| `_stakeMinimum` | `uint256` | Required    | Minimum amount of token required to stake. |

## Add a Token to Blacklist

Add a token to the blacklist. Markets that include the blacklisted token will be ignored. Emits an `AddToBlacklist` event.

```Solidity
function addToBlacklist(
  address token
) external onlyOwner
```

### Params

| Name    | Type      | Optionality | Description                        |
| :------ | :-------- | :---------- | :--------------------------------- |
| `token` | `address` | Required    | Address of the token to blacklist. |

## Remove a Token from Blacklist

Remove a token from the blacklist. Emits a `RemoveFromBlacklist` event.

```Solidity
function removeFromBlacklist(
  address token
) external onlyOwner
```

### Params

| Name    | Type      | Optionality | Description                            |
| :------ | :-------- | :---------- | :------------------------------------- |
| `token` | `address` | Required    | The address of the token to blacklist. |

## Set an Intent to Trade

Stake tokens to the Indexer and set an intent to trade.

```Solidity
function setIntent(
  address makerToken,
  address takerToken,
  uint256 amount,
  uint256 expiry,
  bytes32 locator
) external
```

### Params

| Name         | Type      | Optionality | Description                                  |
| :----------- | :-------- | :---------- | :------------------------------------------- |
| `makerToken` | `address` | Required    | Address of the token that the Maker sends.   |
| `takerToken` | `address` | Required    | Address of the token that the Taker sends.   |
| `amount`     | `uint256` | Required    | Amount of token to stake.                    |
| `expiry`     | `uint256` | Required    | Timestamp after which the intent is invalid. |
| `locator`    | `bytes32` | Required    | Locator for the peer.                        |

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
  address makerToken,
  address takerToken
) external
```

### Params

| Name         | Type      | Optionality | Description                                |
| :----------- | :-------- | :---------- | :----------------------------------------- |
| `makerToken` | `address` | Required    | Address of the token that the Maker sends. |
| `takerToken` | `address` | Required    | Address of the token that the Taker sends. |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |

## Get Intents

Get a list of intents to trade.

```Solidity
function getIntents(
  address makerToken,
  address takerToken,
  uint256 count
) external view returns (bytes32[] memory)
```

### Params

| Name         | Type      | Optionality | Description                                |
| :----------- | :-------- | :---------- | :----------------------------------------- |
| `makerToken` | `address` | Required    | Address of the token that the Maker sends. |
| `takerToken` | `address` | Required    | Address of the token that the Taker sends. |
| `count`      | `uint256` | Required    | Maximum number of items to return.         |

### Reverts

| Reason                  | Scenario                                   |
| :---------------------- | :----------------------------------------- |
| `MARKET_IS_BLACKLISTED` | One or both of the tokens are blacklisted. |
| `MARKET_DOES_NOT_EXIST` | There is no market for the token pair.     |

## Get Size

Get the length of the list of intents for a token pair.

```Solidity
function sizeOf(
  address makerToken,
  address takerToken
) external view returns (uint256)
```

### Params

| Name         | Type      | Optionality | Description                                |
| :----------- | :-------- | :---------- | :----------------------------------------- |
| `makerToken` | `address` | Required    | Address of the token that the Maker sends. |
| `takerToken` | `address` | Required    | Address of the token that the Taker sends. |

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

She then sets his intent passing the `locator` value.
