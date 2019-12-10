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

Packages are versioned based on deploys. Major versions e.g. `1.x.x` are mainnet deploys, while minor versions e.g. `x.1.x` are rinkeby deploys. Packages that are not deployed increment patch versions e.g. `x.x.1`. Each package that includes a deployment includes the ABI files for that deployed contract in `builds/contracts` within the package.

| Package                                                 | Version                                                                                                                   | Description                         |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------ | :---------------------------------- |
| [`@airswap/swap`](/source/swap)                         | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)                         | Atomic Swap Between Tokens          |
| [`@airswap/indexer`](/source/indexer)                   | [![npm](https://img.shields.io/npm/v/@airswap/indexer)](https://www.npmjs.com/package/@airswap/indexer)                   | Counterparty Discovery with Staking |
| [`@airswap/index`](/source/index)                       | [![npm](https://img.shields.io/npm/v/@airswap/index)](https://www.npmjs.com/package/@airswap/index)                       | Ordered List of Locators            |
| [`@airswap/delegate`](/source/delegate)                 | [![npm](https://img.shields.io/npm/v/@airswap/delegate)](https://www.npmjs.com/package/@airswap/delegate)                 | Onchain Trading Delegate            |
| [`@airswap/delegate-factory`](/source/delegate-factory) | [![npm](https://img.shields.io/npm/v/@airswap/delegate-factory)](https://www.npmjs.com/package/@airswap/delegate-factory) | Deploys New Delegates               |
| [`@airswap/types`](/source/types)                       | [![npm](https://img.shields.io/npm/v/@airswap/types)](https://www.npmjs.com/package/@airswap/types)                       | Types and Hashes                    |
| [`@airswap/wrapper`](/source/wrapper)                   | [![npm](https://img.shields.io/npm/v/@airswap/wrapper)](https://www.npmjs.com/package/@airswap/wrapper)                   | Use ether for WETH trades           |
| [`@airswap/tokens`](/source/tokens)                     | [![npm](https://img.shields.io/npm/v/@airswap/tokens)](https://www.npmjs.com/package/@airswap/tokens)                     | Ethereum Tokens                     |

## JavaScript Libraries

| Package                                      | Version                                                                                                         | Description            |
| :------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :--------------------- |
| [`@airswap/order-utils`](/utils/order-utils) | [![npm](https://img.shields.io/npm/v/@airswap/order-utils)](https://www.npmjs.com/package/@airswap/order-utils) | Create and Sign Orders |
| [`@airswap/test-utils`](/utils/test-utils)   | [![npm](https://img.shields.io/npm/v/@airswap/test-utils)](https://www.npmjs.com/package/@airswap/test-utils)   | Test Utilities         |

## Commands

| Command          | Description                                                                         |
| :----------------| :---------------------------------------------------------------------------------- |
| `yarn compile`   | Compile all contracts to `build` folders                                            |
| `yarn clean`     | Delete all contract `build` folders                                                 |
| `yarn ganache`   | Run a local `ganache` network on local host 8545                                    |
| `yarn test`      | Run all contract tests in `test` folders. Requires `yarn ganache` to be run first.  |
| `yarn hint`      | Run a syntax linter for all Solidity code                                           |
| `yarn lint`      | Run a syntax linter for all JavaScript code                                         |

## Deployments

To deploy, please follow [this guide](./utils/deployer/DEPLOYMENT_GUIDE.md)
