<center>
<br />
<img src="https://swap.tech/images/airswap-high-res.png" width="500"/>
<br />
</center>

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens, initially built on the [Swap Protocol](https://swap.tech/whitepaper/). The AirSwap product family includes [DexIndex](https://dexindex.io/), [AirSwap Instant](https://instant.airswap.io/), [AirSwap Trader](https://trader.airswap.io/), and [AirSwap Spaces](https://spaces.airswap.io/). This repository contains smart contracts and JavaScript packages for use by developers and traders on the AirSwap network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)

# Packages

## Smart Contracts

| Package                                  | Version                                                                                                 | Description                  |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------ | :--------------------------- |
| [`@airswap/swap`](/protocols/swap)       | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)       | Atomic Swap                  |
| [`@airswap/indexer`](/protocols/indexer) | [![npm](https://img.shields.io/npm/v/@airswap/indexer)](https://www.npmjs.com/package/@airswap/indexer) | Onchain Indexer with Staking |
| [`@airswap/market`](/protocols/market)   | [![npm](https://img.shields.io/npm/v/@airswap/market)](https://www.npmjs.com/package/@airswap/market)   | Intents for a Token Pair     |
| [`@airswap/peer`](/protocols/peer)       | [![npm](https://img.shields.io/npm/v/@airswap/peer)](https://www.npmjs.com/package/@airswap/peer)       | Onchain Peer with Rules      |
| [`@airswap/types`](/protocols/types)     | [![npm](https://img.shields.io/npm/v/@airswap/types)](https://www.npmjs.com/package/@airswap/types)     | Types and Hashes             |
| [`@airswap/wrapper`](/helpers/wrapper)   | [![npm](https://img.shields.io/npm/v/@airswap/wrapper)](https://www.npmjs.com/package/@airswap/wrapper) | Use ether for WETH trades    |
| [`@airswap/tokens`](/helpers/tokens)     | [![npm](https://img.shields.io/npm/v/@airswap/tokens)](https://www.npmjs.com/package/@airswap/tokens)   | Ethereum Tokens              |

## JavaScript

| Package                                         | Version                                                                                                         | Description            |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :--------------------- |
| [`@airswap/order-utils`](/packages/order-utils) | [![npm](https://img.shields.io/npm/v/@airswap/order-utils)](https://www.npmjs.com/package/@airswap/order-utils) | Create and Sign Orders |
| [`@airswap/test-utils`](/packages/test-utils)   | [![npm](https://img.shields.io/npm/v/@airswap/test-utils)](https://www.npmjs.com/package/@airswap/test-utils)   | Test Utilities         |

# Deployed

| Contract | Package                              | Version | Network | Address                                                                                                                         |
| :------- | :----------------------------------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Swap     | [`@airswap/swap`](/protocols/swap)   | `2.0.0` | Mainnet | [`0x54d2690e97e477a4b33f40d6e4afdd4832c07c57`](https://etherscan.io/address/0x54d2690e97e477a4b33f40d6e4afdd4832c07c57)         |
| Types    | [`@airswap/types`](/protocols/types) | `0.1.0` | Mainnet | [`0xc65ff60eb8e4038a2415bb569d1fa6dca47d692e`](https://etherscan.io/address/0xc65ff60eb8e4038a2415bb569d1fa6dca47d692e)         |
| Swap     | [`@airswap/swap`](/protocols/swap)   | `2.0.0` | Rinkeby | [`0x78db49d0459a67158bdca6e161be3d90342c7247`](https://rinkeby.etherscan.io/address/0x78db49d0459a67158bdca6e161be3d90342c7247) |
| Types    | [`@airswap/types`](/protocols/types) | `0.1.0` | Rinkeby | [`0xaaf6cb19298e7d0abc410eb2a0d5b8fef747573d`](https://rinkeby.etherscan.io/address/0xaaf6cb19298e7d0abc410eb2a0d5b8fef747573d) |

# Examples

## Onchain Peer with Rules

The [authorization feature](/protocols/swap/README.md#authorizations) enables traders to deploy smart contracts that trade on their behalf. These contracts can include arbitrary logic and connect to other liquidity sources.

See [`@airswap/peer`](/protocols/peer) for an implementation based on trading rules.

## Onchain Liquidity Consumer

An arrangement of smart contracts and authorizations can enable wallets to take liquidity without additional signatures. An onchain liquidity "consumer" can interact with an onchain indexer and onchain peers in a single transaction.

See the [`@airswap/consumer`](/examples/consumer) example. **Demonstration only.**

# Commands

| Command        | Description                                 |
| :------------- | :------------------------------------------ |
| `yarn compile` | Compile all contracts to `build` folders    |
| `yarn clean`   | Delete all contract `build` folders         |
| `yarn test`    | Run all contract tests in `test` folders    |
| `yarn hint`    | Run a syntax linter for all Solidity code   |
| `yarn lint`    | Run a syntax linter for all JavaScript code |

# Protocol Migration (V1 to V2)

To migrate to the new Swap Protocol please see [MIGRATION.md](/contracts/swap/MIGRATION.md)
