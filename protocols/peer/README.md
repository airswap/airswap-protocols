# Peer

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `Peer` contract that can be deployed with trading rules.

:bulb: **Note**: `solidity-coverage` does not cooperate with `view` functions. To run test coverage, remove the `view` keywords from functions in `Peer.sol` and `IPeer.sol`.

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
| Consumer          | A party that gets quotes from and sends orders to the peer. Acts as maker. |
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
| `_swapContract`      | `address` | Address of the swap contract used to settle trades.   |
| `_peerContractOwner` | `address` | Address of the owner of the peer for rule management. |

## Price Calculations

All amounts are in the smallest unit (e.g. wei), so all calculations based on price result in a whole number. For calculations that would result in a decimal, the amount is automatically floored by dropping the decimal. For example, a price of `5.25` and `takerParam` of `2` results in `makerParam` of `10` rather than `10.5`. Tokens have many decimal places so these differences are very small.

## Set a Rule

Set a trading rule on the peer.

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
| `_takerToken`     | `address` | The token the peer would send.                                 |
| `_makerToken`     | `address` | The token the consumer would send.                             |
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

Unset a trading rule for the peer.

```Solidity
function unsetRule(
  address _takerToken,
  address _makerToken
) external onlyOwner
```

### Params

| Name          | Type      | Description                        |
| :------------ | :-------- | :--------------------------------- |
| `_takerToken` | `address` | The token the peer would send.     |
| `_makerToken` | `address` | The token the consumer would send. |

## Get a Maker-Side Quote

Get a quote for the maker (consumer) side. Often used to get a buy price for \_quoteTakerToken.

```Solidity
function getMakerSideQuote(
  uint256 _quoteTakerParam,
  address _quoteTakerToken,
  address _quoteMakerToken
) external view returns (
  uint256 _quoteMakerParam
)
```

### Params

| Name          | Type      | Description                                             |
| :------------ | :-------- | :------------------------------------------------------ |
| `_quoteTakerParam` | `uint256` | The amount of ERC-20 token the peer would send.         |
| `_quoteTakerToken` | `address` | The address of an ERC-20 token the peer would send.     |
| `_quoteMakerToken` | `address` | The address of an ERC-20 token the consumer would send. |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the rule. |

## Get a Taker-Side Quote

Get a quote for the taker (peer) side. Often used to get a sell price for \_quoteMakerToken.

```Solidity
function getTakerSideQuote(
  uint256 _quoteMakerParam,
  address _quoteMakerToken,
  address _quoteTakerToken
) external view returns (
  uint256 _quoteTakerParam
)
```

### Params

| Name          | Type      | Description                                             |
| :------------ | :-------- | :------------------------------------------------------ |
| `_quoteMakerParam` | `uint256` | The amount of ERC-20 token the consumer would send.     |
| `_quoteMakerToken` | `address` | The address of an ERC-20 token the consumer would send. |
| `_quoteTakerToken` | `address` | The address of an ERC-20 token the peer would send.     |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the rule. |

## Get a Max Quote

Get the maximum quote from the peer.

```Solidity
function getMaxQuote(
  address _quoteTakerToken,
  address _quoteMakerToken
) external view returns (
  uint256 _quoteTakerParam,
  uint256 _quoteMakerParam
)
```

### Params

| Name          | Type      | Description                                             |
| :------------ | :-------- | :------------------------------------------------------ |
| `_quoteTakerToken` | `address` | The address of an ERC-20 token the peer would send.     |
| `_quoteMakerToken` | `address` | The address of an ERC-20 token the consumer would send. |

### Reverts

| Reason                | Scenario                                  |
| :-------------------- | :---------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no rule set for this token pair. |

## Provide an Order

Provide an order to the peer for taking.

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
| `TOKEN_PAIR_INACTIVE` | There is no rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the rule.                  |
