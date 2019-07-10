# Delegate

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `Delegate` contract that can be deployed with trading rules.

## Features

### Limit Orders

Set rules to only take trades at specific prices.

### Partial Fills

Send up to a maximum amount of a token.

## Definitions

| Term              | Definition                                                      |
| :---------------- | :-------------------------------------------------------------- |
| Delegate          | An authorized third party to a trade.                           |
| Consumer          | A party that gets quotes from and sends orders to the Delegate. |
| Rule              | An amount of tokens to trade at a specific price.               |
| Price Coefficient | The significant digits of the price.                            |
| Price Exponent    | The location of the decimal on the price.                       |

## Constructor

Create a new `Delegate` contract.

```Solidity
constructor(
  address _swapContract
) public
```

### Params

| Name            | Type      | Optionality | Description                                         |
| :-------------- | :-------- | :---------- | :-------------------------------------------------- |
| `_swapContract` | `address` | Required    | Address of the Swap contract used to settle trades. |

## Set a Rule

Set a trading rule for the Delegate.

```Solidity
function setRule(
  address delegateToken,
  address consumerToken,
  uint256 maxDelegateAmount,
  uint256 priceCoef,
  uint256 priceExp
) external onlyOwner
```

### Params

| Name             | Type      | Optionality | Description                                                    |
| :--------------- | :-------- | :---------- | :------------------------------------------------------------- |
| `delegateToken`  | `address` | Required    | The token that the delegate would send in a trade.             |
| `consumerToken`  | `address` | Required    | The token that the consumer would send in a trade.             |
| `maxTakerAmount` | `uint256` | Required    | The maximum amount of token the delegate would send.           |
| `priceCoef`      | `uint256` | Required    | The coefficient of the price to indicate the whole number.     |
| `priceExp`       | `uint256` | Required    | The exponent of the price to indicate location of the decimal. |

### Example

Set a rule to send up to 100,000 DAI for WETH at 0.0032 WETH/DAI

```Solidity
setRule(<WETHAddress>, <DAIAddress>, 100000, 32, 4)
```

## Unset a Rule

Unset a trading rule for the Delegate.

```Solidity
function unsetRule(
  address delegateToken,
  address consumerToken
) external onlyOwner
```

### Params

| Name            | Type      | Optionality | Description                                        |
| :-------------- | :-------- | :---------- | :------------------------------------------------- |
| `delegateToken` | `address` | Required    | The token that the Delegate would send in a trade. |
| `consumerToken` | `address` | Required    | The token that the Consumer would send in a trade. |

## Get a Buy Quote

Get a quote to buy from the Delegate.

```Solidity
function getBuyQuote(
  uint256 delegateAmount,
  address delegateToken,
  address consumerToken
) external view returns (
  bool available,
  uint256 consumerAmount
)
```

### Params

| Name             | Type      | Optionality | Description                             |
| :--------------- | :-------- | :---------- | :-------------------------------------- |
| `delegateAmount` | `uint256` | Required    | The amount the Delegate would send.     |
| `delegateToken`  | `address` | Required    | The token that the Delegate would send. |
| `consumerToken`  | `address` | Required    | The token that the Consumer would send. |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Sell Quote

Get a quote to sell from the Delegate.

```Solidity
function getSellQuote(
  uint256 consumerAmount,
  address consumerToken,
  address delegateToken
) external view returns (
  bool available,
  uint256 delegateAmount
)
```

### Params

| Name             | Type      | Optionality | Description                            |
| :--------------- | :-------- | :---------- | :------------------------------------- |
| `consumerAmount` | `uint256` | Required    | The amount the Consumer would send.    |
| `consumerToken`  | `address` | Required    | The token that the Consumer will send. |
| `delegateToken`  | `address` | Required    | The token that the Delegate will send. |

### Reverts

| Reason                | Scenario                                         |
| :-------------------- | :----------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.        |
| `AMOUNT_EXCEEDS_MAX`  | The quote would exceed the maximum for the Rule. |

## Get a Max Quote

Get the maximum quote from the Delegate.

```Solidity
function getMaxQuote(
  address delegateToken,
  address consumerToken
) external view returns (
  bool available,
  uint256 delegateAmount,
  uint256 consumerAmount
)
```

### Params

| Name            | Type      | Optionality | Description                            |
| :-------------- | :-------- | :---------- | :------------------------------------- |
| `delegateToken` | `address` | Required    | The token that the Delegate will send. |
| `consumerToken` | `address` | Required    | The token that the Consumer will send. |

### Reverts

| Reason                | Scenario                                  |
| :-------------------- | :---------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair. |

## Provide an Order

Provide an order to the Delegate for taking.

```Solidity
function provideOrder(
  uint256 nonce,
  uint256 expiry,
  address consumerWallet,
  uint256 consumerAmount,
  address consumerToken,
  address delegateWallet,
  uint256 delegateAmount,
  address delegateToken,
  uint8 v,
  bytes32 r,
  bytes32 s
) public payable
```

### Params

| Name             | Type      | Optionality | Description                                            |
| :--------------- | :-------- | :---------- | :----------------------------------------------------- |
| `nonce`          | `uint256` | Required    | A single use identifier for the Order.                 |
| `expiry`         | `uint256` | Required    | The expiry in seconds since unix epoch.                |
| `consumerWallet` | `address` | Required    | The Maker of the Order who sets price.                 |
| `consumerAmount` | `uint256` | Required    | The amount or identifier of the token the Maker sends. |
| `consumerToken`  | `address` | Required    | The address of the token the Maker sends.              |
| `delegateWallet` | `address` | Required    | The Taker of the Order who takes price.                |
| `delegateAmount` | `uint256` | Required    | The amount or identifier of the token the Taker sends. |
| `delegateToken`  | `address` | Required    | The address of the token the Taker sends.              |
| `v`              | `uint8`   | Required    | The `v` value of an ECDSA signature.                   |
| `r`              | `bytes32` | Required    | The `r` value of an ECDSA signature.                   |
| `s`              | `bytes32` | Required    | The `s` value of an ECDSA signature.                   |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |

## Provide an Unsigned Order

Provide an unsigned order to the Delegate. Requires that the Consumer has authorized the Delegate on the Swap contract.

```Solidity
function provideUnsignedOrder(
  uint256 nonce,
  uint256 consumerAmount,
  address consumerToken,
  uint256 delegateAmount,
  address delegateToken
) public payable
```

### Params

| Name             | Type      | Optionality | Description                                            |
| :--------------- | :-------- | :---------- | :----------------------------------------------------- |
| `nonce`          | `uint256` | Required    | A single use identifier for the Order.                 |
| `expiry`         | `uint256` | Required    | The expiry in seconds since unix epoch.                |
| `consumerAmount` | `uint256` | Required    | The amount or identifier of the token the Maker sends. |
| `consumerToken`  | `address` | Required    | The address of the token the Maker sends.              |
| `delegateAmount` | `uint256` | Required    | The amount or identifier of the token the Taker sends. |
| `delegateToken`  | `address` | Required    | The address of the token the Taker sends.              |

### Reverts

| Reason                | Scenario                                                       |
| :-------------------- | :------------------------------------------------------------- |
| `TOKEN_PAIR_INACTIVE` | There is no Rule set for this token pair.                      |
| `AMOUNT_EXCEEDS_MAX`  | The amount of the trade would exceed the maximum for the Rule. |
| `PRICE_INCORRECT`     | The order is priced incorrectly for the Rule.                  |
