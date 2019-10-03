<br />
<img src="https://swap.tech/images/airswap-high-res.png" width="500"/>
<br />

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens, initially built on the [Swap Protocol](https://swap.tech/whitepaper/). The AirSwap product family includes [DexIndex](https://dexindex.io/), [AirSwap Instant](https://instant.airswap.io/), [AirSwap Trader](https://trader.airswap.io/), and [AirSwap Spaces](https://spaces.airswap.io/). This repository contains smart contracts and JavaScript packages for use by developers and traders on the AirSwap network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://chat.airswap.io)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://docs.airswap.io/
- Website → https://www.airswap.io/
- Blog → https://blog.airswap.io/
- Support → https://support.airswap.io/

## Smart Contracts

| Package                                            | Version                                                                                                           | Description                         |
| :------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| [`@airswap/swap`](/protocols/swap)                 | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)                 | Atomic Swap                         |
| [`@airswap/indexer`](/protocols/indexer)           | [![npm](https://img.shields.io/npm/v/@airswap/indexer)](https://www.npmjs.com/package/@airswap/indexer)           | Onchain Delegate Discovery with Staking |
| [`@airswap/index`](/protocols/index)               | [![npm](https://img.shields.io/npm/v/@airswap/index)](https://www.npmjs.com/package/@airswap/index)               | Ordered List of Delegate Signals        |
| [`@airswap/delegate`](/protocols/delegate)                 | [![npm](https://img.shields.io/npm/v/@airswap/delegate)](https://www.npmjs.com/package/@airswap/delegate)                 | Onchain Delegate with Rules             |
| [`@airswap/delegate-factory`](/protocols/delegate-factory) | [![npm](https://img.shields.io/npm/v/@airswap/delegate-factory)](https://www.npmjs.com/package/@airswap/delegate-factory) | Deploys Delegate Contracts              |
| [`@airswap/types`](/protocols/types)               | [![npm](https://img.shields.io/npm/v/@airswap/types)](https://www.npmjs.com/package/@airswap/types)               | Types and Hashes                    |
| [`@airswap/wrapper`](/helpers/wrapper)             | [![npm](https://img.shields.io/npm/v/@airswap/wrapper)](https://www.npmjs.com/package/@airswap/wrapper)           | Use ether for WETH trades           |
| [`@airswap/tokens`](/helpers/tokens)               | [![npm](https://img.shields.io/npm/v/@airswap/tokens)](https://www.npmjs.com/package/@airswap/tokens)             | Ethereum Tokens                     |

## JavaScript Libraries

| Package                                         | Version                                                                                                         | Description            |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :--------------------- |
| [`@airswap/order-utils`](/packages/order-utils) | [![npm](https://img.shields.io/npm/v/@airswap/order-utils)](https://www.npmjs.com/package/@airswap/order-utils) | Create and Sign Orders |
| [`@airswap/test-utils`](/packages/test-utils)   | [![npm](https://img.shields.io/npm/v/@airswap/test-utils)](https://www.npmjs.com/package/@airswap/test-utils)   | Test Utilities         |

## Commands

| Command        | Description                                 |
| :------------- | :------------------------------------------ |
| `yarn compile` | Compile all contracts to `build` folders    |
| `yarn clean`   | Delete all contract `build` folders         |
| `yarn test`    | Run all contract tests in `test` folders    |
| `yarn hint`    | Run a syntax linter for all Solidity code   |
| `yarn lint`    | Run a syntax linter for all JavaScript code |
