[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens, initially built on the [Swap Protocol](https://www.airswap.io/whitepaper.htm). This repository contains smart contracts and JavaScript packages for use by developers and traders on the AirSwap network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://chat.airswap.io)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- About → https://about.airswap.io/
- Website → https://www.airswap.io/
- Twitter → https://twitter.com/airswap
- Chat → https://chat.airswap.io/

## Smart Contracts

Packages are versioned based on deploys. Major versions e.g. `1.x.x` are mainnet deploys, while minor versions e.g. `x.1.x` are rinkeby deploys. Packages that are not deployed increment patch versions e.g. `x.x.1`. Each package that includes a deployment includes the ABI files for that deployed contract in `build/contracts` within the package.

| Package                                   | Version                                                                                                     | Description              |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :----------------------- |
| [`@airswap/swap`](/source/swap)           | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)           | Atomic Token Swap        |
| [`@airswap/registry`](/source/registry)   | [![npm](https://img.shields.io/npm/v/@airswap/registry)](https://www.npmjs.com/package/@airswap/registry)   | Counterparty Discovery   |
| [`@airswap/staking`](/source/staking)     | [![npm](https://img.shields.io/npm/v/@airswap/staking)](https://www.npmjs.com/package/@airswap/staking)     | Staking for Members      |
| [`@airswap/pool`](/source/pool)           | [![npm](https://img.shields.io/npm/v/@airswap/pool)](https://www.npmjs.com/package/@airswap/pool)           | Rewards Pool for Members |
| [`@airswap/converter`](/source/converter) | [![npm](https://img.shields.io/npm/v/@airswap/converter)](https://www.npmjs.com/package/@airswap/converter) | Converter for Fee Tokens |

## JavaScript Libraries

| Package                                    | Version                                                                                                       | Description               |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------ |
| [`@airswap/libraries`](/tools/libraries)   | [![npm](https://img.shields.io/npm/v/@airswap/libraries)](https://www.npmjs.com/package/@airswap/libraries)   | Protocol Client Libraries |
| [`@airswap/utils`](/tools/utils)           | [![npm](https://img.shields.io/npm/v/@airswap/utils)](https://www.npmjs.com/package/@airswap/utils)           | Orders and Signatures     |
| [`@airswap/metadata`](/tools/metadata)     | [![npm](https://img.shields.io/npm/v/@airswap/metadata)](https://www.npmjs.com/package/@airswap/metadata)     | Token Metadata            |
| [`@airswap/constants`](/tools/constants)   | [![npm](https://img.shields.io/npm/v/@airswap/constants)](https://www.npmjs.com/package/@airswap/constants)   | Helpful Constants         |
| [`@airswap/typescript`](/tools/typescript) | [![npm](https://img.shields.io/npm/v/@airswap/typescript)](https://www.npmjs.com/package/@airswap/typescript) | TypeScript Types          |
| [`@airswap/merkle`](/tools/merkle)         | [![npm](https://img.shields.io/npm/v/@airswap/merkle)](https://www.npmjs.com/package/@airswap/merkle)         | Merkle Tree Helpers       |

## Repository Commands

| Command           | Description                                  |
| :---------------- | :------------------------------------------- |
| `yarn compile`    | Compile all contracts to `build` folders.    |
| `yarn clean`      | Delete all contract `build` folders.         |
| `yarn test`       | Run all contract tests in `test` folders.    |
| `yarn hint`       | Run a syntax linter for all Solidity code.   |
| `yarn lint`       | Run a syntax linter for all JavaScript code. |
| `yarn deps:check` | Run a dependency consistency check.          |

## Deploying Contracts

Each package in `source` has commands `yarn deploy` and `yarn verify`. Each command takes a `--network` flag. For example:

```
yarn deploy --network rinkeby
yarn verify --network rinkeby
```

The account used to deploy and verify is derived from the `MNEMONIC` environment variable in `.env` in the repository root. The source of these scripts can be found in the `scripts` folder of each package.
