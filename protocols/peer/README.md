# Peer

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `Peer` contract that can be deployed with trading rules.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

### Limit Orders

Set rules to only take trades at specific prices.

### Partial Fills

Send up to a maximum amount of a token.

## Definitions

| Term              | Definition                                                  |
| :---------------- | :---------------------------------------------------------- |
| Peer              | Smart contract that trades based on rules.                  |
| Consumer          | A party that gets quotes from and sends orders to the Peer. |
| Rule              | An amount of tokens to trade at a specific price.           |
| Price Coefficient | The significant digits of the price.                        |
| Price Exponent    | The location of the decimal on the price.                   |

## Constructor

Create a new `Peer` contract.

```Solidity
constructor(
  address _swapContract,
  address _peerContractOwner
) public
```

### Params

| Name                 | Type      | Description                                           |
| :------------------- | :-------- | :---------------------------------------------------- |
| `_swapContract`      | `address` | Address of the Swap contract used to settle trades.   |
| `_peerContractOwner` | `address` | Address of the owner of the peer for rule management. |

## Price Calculations

All amounts are in the smallest unit (e.g. wei), so all calculations based on price result in a whole number. For calculations that would result in a decimal, the amount is automatically floored by dropping the decimal. For example, a price of `5.25` and `peerAmount` of `2` results in `consumerAmount` of `10` rather than `10.5`. Tokens have many decimal places so these differences are very small.

## Set a Rule

Set a trading rule for the Peer.

```Solidity
function setRule(
  address peerToken,
  address consumerToken,
  uint256 maxPeerAmount,
  uint256 priceCoef,
  uint256 priceExp
) external onlyOwner
```

### Params

| Name            | Type      | Description                                                    |
| :-------------- | :-------- | :------------------------------------------------------------- |
| `peerToken`     | `address` | The token that the peer would send in a trade.                 |
| `consumerToken` | `address` | The token that the consumer would send in a trade.             |
| `maxPeerAmount` | `uint256` | The maximum amount of token the peer would send.               |
| `priceCoef`     | `uint256` | The coefficient of the price to indicate the whole number.     |
| `priceExp`      | `uint256` | The exponent of the price to indicate location of the decimal. |

### Example

Set a rule to send up to 100,000 DAI for WETH at 0.0032 WETH/DAI

```Solidity
setRule(<WETHAddress>, <DAIAddress>, 100000, 32, 4)
```

Set a rule to send up to 100,000 DAI for WETH at 312.50 WETH/DAI

```Solidity
setRule(<WETHAddress>, <DAIAddress>, 100000, 32150, 2)
```

Set a rule to send up to 100,000 DAI for WETH at 312 WETH/DAI

```Solidity
setRule(<WETHAddress>, <DAIAddress>, 100000, 312, 0)
```

## Unset a Rule

Unset a trading rule for the Peer.

```Solidity
function unsetRule(
  address peerToken,
  address consumerToken
) external onlyOwner
```

### Params

| Name            | Type      | Description                                        |
| :-------------- | :-------- | :------------------------------------------------- |
| `peerToken`     | `address` | The token that the Peer would send in a trade.     |
| `consumerToken` | `address` | The token that the Consumer would send in a trade. |

## Get a Buy Quote

Get a quote to buy from the Peer.

```Solidity
function getBuyQuote(
  uint256 peerAmount,
  address peerToken,
  address consumerToken
) external view returns (
  uint256 consumerAmount
)
```

### Params

| Name            | Type      | Description                             |
| :-------------- | :-------- | :-------------------------------------- |
| `peerAmount`    | `uint256` | The amount the Peer would send.         |
| `peerToken`     | `address` | The token that the Peer would send.     |
| `consumerToken` | `address` | The token that the Consumer would send. |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Sell Quote

Get a quote to sell from the Peer.

```Solidity
function getSellQuote(
  uint256 consumerAmount,
  address consumerToken,
  address peerToken
) external view returns (uint256)
```

### Params

| Name             | Type      | Description                            |
| :--------------- | :-------- | :------------------------------------- |
| `consumerAmount` | `uint256` | The amount the Consumer would send.    |
| `consumerToken`  | `address` | The token that the Consumer will send. |
| `peerToken`      | `address` | The token that the Peer will send.     |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Max Quote

Get the maximum quote from the Peer.

```Solidity
function getMaxQuote(
  address peerToken,
  address consumerToken
) external view returns (
  uint256 peerAmount,
  uint256 consumerAmount
)
```

### Params

| Name            | Type      | Description                            |
| :-------------- | :-------- | :------------------------------------- |
| `peerToken`     | `address` | The token that the Peer will send.     |
| `consumerToken` | `address` | The token that the Consumer will send. |

### Reverts

| Reason                | Scenario                                  |
| :-------------------- | :---------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair. |

## Provide an Order

Provide an order to the Peer for taking.

```Solidity
function provideOrder(
  uint256 nonce,
  uint256 expiry,
  address consumerWallet,
  uint256 consumerAmount,
  address consumerToken,
  address peerWallet,
  uint256 peerAmount,
  address peerToken,
  uint8 v,
  bytes32 r,
  bytes32 s
) public
```

### Params

| Name             | Type      | Description                                            |
| :--------------- | :-------- | :----------------------------------------------------- |
| `nonce`          | `uint256` | A single use identifier for the Order.                 |
| `expiry`         | `uint256` | The expiry in seconds since unix epoch.                |
| `consumerWallet` | `address` | The Maker of the Order who sets price.                 |
| `consumerAmount` | `uint256` | The amount or identifier of the token the Maker sends. |
| `consumerToken`  | `address` | The address of the token the Maker sends.              |
| `peerWallet`     | `address` | The Taker of the Order who takes price.                |
| `peerAmount`     | `uint256` | The amount or identifier of the token the Taker sends. |
| `peerToken`      | `address` | The address of the token the Taker sends.              |
| `v`              | `uint8`   | The `v` value of an ECDSA signature.                   |
| `r`              | `bytes32` | The `r` value of an ECDSA signature.                   |
| `s`              | `bytes32` | The `s` value of an ECDSA signature.                   |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |

## Provide an Unsigned Order

Provide an unsigned order to the Peer. Requires that the Consumer has authorized the Peer on the Swap contract.

```Solidity
function provideUnsignedOrder(
  uint256 nonce,
  uint256 consumerAmount,
  address consumerToken,
  uint256 peerAmount,
  address peerToken
) public
```

### Params

| Name             | Type      | Description                                            |
| :--------------- | :-------- | :----------------------------------------------------- |
| `nonce`          | `uint256` | A single use identifier for the Order.                 |
| `expiry`         | `uint256` | The expiry in seconds since unix epoch.                |
| `consumerAmount` | `uint256` | The amount or identifier of the token the Maker sends. |
| `consumerToken`  | `address` | The address of the token the Maker sends.              |
| `peerAmount`     | `uint256` | The amount or identifier of the token the Taker sends. |
| `peerToken`      | `address` | The address of the token the Taker sends.              |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |
