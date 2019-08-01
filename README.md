<center>
<br />
<img src="https://swap.tech/images/airswap-high-res.png" width="500"/>
<br />
</center>

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens, initially built on the [Swap Protocol](https://swap.tech/whitepaper/). AirSwap is comprised of several user-facing products including [AirSwap Instant](https://instant.airswap.io/) and [AirSwap Spaces](https://spaces.airswap.io/). This repository contains smart contracts and JavaScript packages for use by developers and traders on the AirSwap network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)

# Packages

## Smart Contracts

| Package                                   | Version                                                                                                       | Description               |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------ |
| [`@airswap/swap`](/core/swap)             | [![npm](https://img.shields.io/npm/v/airswap/swap.svg)](https://www.npmjs.com/package/airswap/swap)           | Atomic Swap               |
| [`@airswap/indexer`](/core/indexer)       | [![npm](https://img.shields.io/npm/v/airswap/indexer.svg)](https://www.npmjs.com/package/airswap/indexer)     | Indexer with Staking      |
| [`@airswap/market`](/core/market)         | [![npm](https://img.shields.io/npm/v/airswap/market.svg)](https://www.npmjs.com/package/airswap/market)       | Intents for a Token Pair  |
| [`@airswap/delegate`](/core/delegate)     | [![npm](https://img.shields.io/npm/v/airswap/delegate.svg)](https://www.npmjs.com/package/airswap/delegate)   | Delegate with Rules       |
| [`@airswap/wrapper`](/core/wrapper)       | [![npm](https://img.shields.io/npm/v/airswap/wrapper.svg)](https://www.npmjs.com/package/airswap/wrapper)     | Use ether for WETH trades |
| [`@airswap/libraries`](/common/libraries) | [![npm](https://img.shields.io/npm/v/airswap/libraries.svg)](https://www.npmjs.com/package/airswap/libraries) | Common Libraries          |
| [`@airswap/tokens`](/common/tokens)       | [![npm](https://img.shields.io/npm/v/airswap/tokens.svg)](https://www.npmjs.com/package/airswap/tokens)       | Ethereum Tokens           |
| [`@airswap/consumer`](/examples/consumer) | [![npm](https://img.shields.io/npm/v/airswap/consumer.svg)](https://www.npmjs.com/package/airswap/consumer)   | Liquidity Consumer        |

## JavaScript

| Package                                             | Version                                                                                                               | Description               |
| :-------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------------ |
| [`@airswap/order-utils`](/packages/order-utils)     | [![npm](https://img.shields.io/npm/v/airswap/order-utils.svg)](https://www.npmjs.com/package/airswap/order-utils)     | Create and Sign Orders    |
| [`@airswap/indexer-utils`](/packages/indexer-utils) | [![npm](https://img.shields.io/npm/v/airswap/indexer-utils.svg)](https://www.npmjs.com/package/airswap/indexer-utils) | Interact with the Indexer |
| [`@airswap/test-utils`](/packages/test-utils)       | [![npm](https://img.shields.io/npm/v/airswap/test-utils.svg)](https://www.npmjs.com/package/airswap/test-utils)       | Test Utilities            |

## Commands

| Command        | Description                                 |
| :------------- | :------------------------------------------ |
| `yarn compile` | Compile all contracts to `build` folders    |
| `yarn clean`   | Delete all contract `build` folders         |
| `yarn test`    | Run all contract tests in `test` folders    |
| `yarn hint`    | Run a syntax linter for all Solidity code   |
| `yarn lint`    | Run a syntax linter for all JavaScript code |

## Protocol Migration (V1 to V2)

To migrate to the new Swap Protocol please see [MIGRATION.md](/contracts/swap/MIGRATION.md)
