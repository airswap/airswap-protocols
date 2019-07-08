# Consumer

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains a contract `Consumer` that represents an on-chain integration of an `Indexer`, `Delegate`, and `Swap` contract.

## Features

### On-chain Liquidity

One-time approval for each token and no off-chain signatures required.

## Definitions

| Term     | Definition                                        |
| :------- | :------------------------------------------------ |
| Consumer | Smart contract that integrates onchain liquidity. |
| Indexer  | List of intents to trade by token pair.           |
| Delegate | Smart contract that trades based on rules.        |
| User     | Account that invokes functions on the Consumer.   |

## Constructor

Create a new `Consumer` contract.

```Solidity
constructor(
  address _indexerContract,
  address _swapContract
) public
```

### Arguments

| Name               | Type      | Optionality | Description                                         |
| :----------------- | :-------- | :---------- | :-------------------------------------------------- |
| `_indexerContract` | `address` | Required    | Address of the Indexer to fetch intents from.       |
| `_swapContract`    | `address` | Required    | Address of the Swap contract used to settle trades. |

## Find the Best Buy

Find the best buy price among Delegates on the selected Indexer.

```Solidity
function findBestBuy(
  uint256 userReceiveAmount,
  address userReceiveToken,
  address userSendToken,
  uint256 maxIntents
) public view returns (address, uint256)
```

### Arguments

| Name                | Type      | Optionality | Description                    |
| :------------------ | :-------- | :---------- | :----------------------------- |
| `userReceiveAmount` | `uint256` | Required    | Amount of token to buy.        |
| `userReceiveToken`  | `address` | Required    | Address of token to buy.       |
| `userSendToken`     | `address` | Required    | Address of token to spend.     |
| `maxIntents`        | `uint256` | Required    | Max number of intents to scan. |

## Take the Best Buy

Take the best buy price among Delegates on the selected Indexer. Requires that the User has approved the Consumer to transfer the `userSendToken` on his or her behalf.

```Solidity
function takeBestBuy(
  uint256 userReceiveAmount,
  address userReceiveToken,
  address userSendToken,
  uint256 maxIntents
) public
```

### Arguments

| Name                | Type      | Optionality | Description                    |
| :------------------ | :-------- | :---------- | :----------------------------- |
| `userReceiveAmount` | `uint256` | Required    | Amount of token to buy.        |
| `userReceiveToken`  | `address` | Required    | Address of token to buy.       |
| `userSendToken`     | `address` | Required    | Address of token to spend.     |
| `maxIntents`        | `uint256` | Required    | Max number of intents to scan. |
