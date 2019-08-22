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

| Term              | Definition                                                                 |
| :---------------- | :------------------------------------------------------------------------- |
| Peer              | Smart contract that trades based on rules. Acts as taker.                  |
| Consumer          | A party that gets quotes from and sends orders to the Peer. Acts as maker. |
| Rule              | An amount of tokens to trade at a specific price.                          |
| Price Coefficient | The significant digits of the price.                                       |
| Price Exponent    | The location of the decimal on the price.                                  |

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

All amounts are in the smallest unit (e.g. wei), so all calculations based on price result in a whole number. For calculations that would result in a decimal, the amount is automatically floored by dropping the decimal. For example, a price of `5.25` and `takerAmount` of `2` results in `makerAmount` of `10` rather than `10.5`. Tokens have many decimal places so these differences are very small.

## Set a Rule

Set a trading rule for the Peer.

```Solidity
function setRule(
  address _takerToken,
  address _makerToken,
  uint256 _maxTakerAmount,
  uint256 _priceCoef,
  uint256 _priceExp
) external onlyOwner
```

### Params

| Name              | Type      | Description                                                    |
| :---------------- | :-------- | :------------------------------------------------------------- |
| `_takerToken`     | `address` | The token that the peer would send in a trade.                 |
| `_makerToken`     | `address` | The token that the consumer would send in a trade.             |
| `_maxTakerAmount` | `uint256` | The maximum amount of token the peer would send.               |
| `_priceCoef`      | `uint256` | The coefficient of the price to indicate the whole number.     |
| `_priceExp`       | `uint256` | The exponent of the price to indicate location of the decimal. |

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
  address _takerToken,
  address _makerToken
) external onlyOwner
```

### Params

| Name          | Type      | Description                                        |
| :------------ | :-------- | :------------------------------------------------- |
| `_takerToken` | `address` | The token that the Peer would send in a trade.     |
| `_makerToken` | `address` | The token that the Consumer would send in a trade. |

## Get a Buy Quote

Get a quote to buy from the Peer.

```Solidity
function getBuyQuote(
  uint256 _takerAmount,
  address _takerToken,
  address _makerToken
) external view returns (
  uint256 _makerAmount
)
```

### Params

| Name           | Type      | Description                             |
| :------------- | :-------- | :-------------------------------------- |
| `_takerAmount` | `uint256` | The amount the Peer would send.         |
| `_takerToken`  | `address` | The token that the Peer would send.     |
| `_makerToken`  | `address` | The token that the Consumer would send. |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Sell Quote

Get a quote to sell from the Peer.

```Solidity
function getSellQuote(
  uint256 _makerAmount,
  address _makerToken,
  address _takerToken
) external view returns (uint256)
```

### Params

| Name           | Type      | Description                            |
| :------------- | :-------- | :------------------------------------- |
| `_makerAmount` | `uint256` | The amount the Consumer would send.    |
| `_makerToken`  | `address` | The token that the Consumer will send. |
| `_takerToken`  | `address` | The token that the Peer will send.     |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Max Quote

Get the maximum quote from the Peer.

```Solidity
function getMaxQuote(
  address _takerToken,
  address _makerToken
) external view returns (
  uint256 _takerAmount,
  uint256 _makerAmount
)
```

### Params

| Name          | Type      | Description                            |
| :------------ | :-------- | :------------------------------------- |
| `_takerToken` | `address` | The token that the Peer will send.     |
| `_makerToken` | `address` | The token that the Consumer will send. |

### Reverts

| Reason                | Scenario                                  |
| :-------------------- | :---------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair. |

## Provide an Order

Provide an order to the Peer for taking.

```Solidity
function provideOrder(
  Types.Order memory _order,
  Types.Signature memory _signature
) public
```

### Params

| Name        | Type        | Description                                                    |
| :---------- | :---------- | :------------------------------------------------------------- |
| `order`     | `Order`     | Order struct as specified in the `@airswap/types` package.     |
| `signature` | `Signature` | Signature struct as specified in the `@airswap/types` package. |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |

## Provide an Unsigned Order

Provide an unsigned order to the Peer. Requires that the Consumer has authorized the Peer on the Swap contract.
The Signature should be an empty Signature struct to support the unsigned order.

```Solidity
function provideOrder(
  Types.Order memory _order,
  Types.Signature memory _signature
) public
```

### Params

| Name        | Type        | Description                                                    |
| :---------- | :---------- | :------------------------------------------------------------- |
| `order`     | `Order`     | Order struct as specified in the `@airswap/types` package.     |
| `signature` | `Signature` | Signature struct as specified in the `@airswap/types` package. |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |
