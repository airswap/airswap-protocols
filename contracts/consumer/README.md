# Consumer

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `Consumer` that represents an on-chain integration of `Indexer`, `Delegate`, and `Swap` contracts.

#### :bulb: TODO

- Consider ways to selectively trust Delegates rather than sending unsigned orders to untrusted Delegates.

## Features

### On-chain Liquidity

One-time approval for each token and no off-chain signatures required.

## Definitions

| Term     | Definition                                                         |
| :------- | :----------------------------------------------------------------- |
| Consumer | Smart contract that integrates onchain liquidity.                  |
| Indexer  | List of intents to trade by token pair.                            |
| Delegate | Smart contract that trades based on rules.                         |
| Swap     | Transaction of multiple transfers that succeeds entirely or fails. |
| User     | Account that invokes functions on the Consumer.                    |

## Constructor

Create a new `Consumer` contract.

```Solidity
constructor(
  address _swapContract,
  address _indexerContract
) public
```

### Params

| Name               | Type      | Description                                         |
| :----------------- | :-------- | :-------------------------------------------------- |
| `_swapContract`    | `address` | Address of the Swap contract used to settle trades. |
| `_indexerContract` | `address` | Address of the Indexer to fetch intents from.       |

## Find the Best Buy

Find the best buy price among Delegates on the selected Indexer.

```Solidity
function findBestBuy(
  uint256 _userReceiveAmount,
  address _userReceiveToken,
  address _userSendToken,
  uint256 _maxIntents
) public view returns (address, uint256)
```

### Params

| Name                 | Type      | Description                    |
| :------------------- | :-------- | :----------------------------- |
| `_userReceiveAmount` | `uint256` | Amount of token to buy.        |
| `_userReceiveToken`  | `address` | Address of token to buy.       |
| `_userSendToken`     | `address` | Address of token to spend.     |
| `_maxIntents`        | `uint256` | Max number of intents to scan. |

## Take the Best Buy

Take the best buy price among Delegates on the selected Indexer. Requires that the User has approved the Consumer to transfer the `_userSendToken` on his or her behalf.

```Solidity
function takeBestBuy(
  uint256 _userReceiveAmount,
  address _userReceiveToken,
  address _userSendToken,
  uint256 _maxIntents
) public
```

### Params

| Name                 | Type      | Description                    |
| :------------------- | :-------- | :----------------------------- |
| `_userReceiveAmount` | `uint256` | Amount of token to buy.        |
| `_userReceiveToken`  | `address` | Address of token to buy.       |
| `_userSendToken`     | `address` | Address of token to spend.     |
| `_maxIntents`        | `uint256` | Max number of intents to scan. |
