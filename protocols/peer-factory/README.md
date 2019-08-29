# PeerFactory

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `PeerFactory` contract that deploys `Peer` contracts.

:bulb: **Note**: `solidity-coverage` does not cooperate with `view` functions. To run test coverage, remove the `view` keywords from functions in `PeerFactory.sol`.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

### Features

#### Deploys Peer Contracts

Creates peers with a trusted interface

#### Has lookup to find peer contracts it has deployed

### Definitions

| Term | Definition                                                |
| :--- | :-------------------------------------------------------- |
| Peer | Smart contract that trades based on rules. Acts as taker. |

### Constructor

Create a new `Peer` contract.

```Solidity
constructor(
  address _swapContract,
  address _peerContractOwner
) public
```

### Create a new `Peer` contract.

```Solidity
createPeer(
  address _swapContract,
  address _peerContractOwner
) external returns
  (address peerContractAddress)
```

#### Params

| Name                 | Type      | Description                                           |
| :------------------- | :-------- | :---------------------------------------------------- |
| `_swapContract`      | `address` | Address of the swap contract used to settle trades.   |
| `_peerContractOwner` | `address` | Address of the owner of the peer for rule management. |

### Lookup for deployed peers

To check whether a locator was deployed

```Solidity
function has(
  bytes32 _locator
) external returns (bool)
```

#### Params

| Name       | Type      | Description                                      |
| :--------- | :-------- | :----------------------------------------------- |
| `_locator` | `bytes32` | locator of the peer in question, ex an `address` |
