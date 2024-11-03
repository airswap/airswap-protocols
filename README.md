# AirSwap Protocols

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network. This repository contains smart contracts for use by developers and traders on the AirSwap network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://chat.airswap.io)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Discord → https://chat.airswap.io/
- X → https://x.com/airswap
- Website → https://www.airswap.io/
- About → https://about.airswap.io/

## Contracts

| Package                                     | Version                                                                                                       | Description                 |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------ | :-------------------------- |
| [`@airswap/registry`](/source/registry)     | [![npm](https://img.shields.io/npm/v/@airswap/registry)](https://www.npmjs.com/package/@airswap/registry)     | Server Registry             |
| [`@airswap/swap`](/source/swap)             | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)             | Atomic Token Swap           |
| [`@airswap/swap-erc20`](/source/swap-erc20) | [![npm](https://img.shields.io/npm/v/@airswap/swap-erc20)](https://www.npmjs.com/package/@airswap/swap-erc20) | Atomic Token Swap (ERC20)   |
| [`@airswap/wrapper`](/source/wrapper)       | [![npm](https://img.shields.io/npm/v/@airswap/wrapper)](https://www.npmjs.com/package/@airswap/wrapper)       | Wrapper for Native Tokens   |
| [`@airswap/staking`](/source/staking)       | [![npm](https://img.shields.io/npm/v/@airswap/staking)](https://www.npmjs.com/package/@airswap/staking)       | Staking for Members         |
| [`@airswap/pool`](/source/pool)             | [![npm](https://img.shields.io/npm/v/@airswap/pool)](https://www.npmjs.com/package/@airswap/pool)             | Rewards Pool for Members    |
| [`@airswap/batch-call`](/source/batch-call) | [![npm](https://img.shields.io/npm/v/@airswap/batch-call)](https://www.npmjs.com/package/@airswap/batch-call) | Batch Token and Order Calls |

## Tools

| Package                                 | Version                                                                                                     | Description              |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :----------------------- |
| [`@airswap/libraries`](tools/libraries) | [![npm](https://img.shields.io/npm/v/@airswap/libraries)](https://www.npmjs.com/package/@airswap/libraries) | Libraries for Developers |
| [`@airswap/utils`](/tools/utils)        | [![npm](https://img.shields.io/npm/v/@airswap/utils)](https://www.npmjs.com/package/@airswap/utils)         | Utils for Developers     |

## Commands

| Command           | Description                               |
| :---------------- | :---------------------------------------- |
| `yarn compile`    | Compile all contracts to `build` folders. |
| `yarn clean`      | Clean all contract `build` folders.       |
| `yarn test`       | Run all contract tests in `test` folders. |
| `yarn lint:fix`   | Run eslint for all JavaScript code.       |
| `yarn pretty:fix` | Run prettier for all JavaScript code.     |

## Branching

Flow for contracts and associated tools:
Branch from Develop; Merge Feature → Develop → Beta → Main

Flow for tool updates (not contracts):
Branch from Main; Merge Feature → Main → Develop

## Process

**Regular development process for a complete release**

1. New work and features are cut from and merged to "develop"

   1. Cut feature branches from develop
   2. Merge feature branches into develop (Squash and Merge)

2. Merge "develop" into "beta" to publish beta packages. (Semver: x.x.x-beta.x)

   1. Merge develop into beta (Merge Commit): this will publish NPM with "beta" tag.
   2. Tag beta release from beta branch. (x.x.x-beta.x)
   3. Share tagged release with auditors if auditing.

3. Merge "develop" into "main" to publish latest packages. (Semver: x.x.x)

   1. Merge develop into main (Merge Commit): this will publish NPM with "latest" tag.
   2. Merge main into beta: this will update the beta with latest.
   3. Tag release from main branch. (x.x.x)

Each `deploys.js` must be limited to contracts deployed from that package version.

**Individual package features or patches**

1. Cut a feature or fix branch from main.
2. Merge fix into main (Squash and Merge): this will publish to NPM with "latest" tag.
3. Merge main into develop.

## Deploying and Verifying

Each package has commands `yarn deploy` and `yarn verify`. Each command takes a `--network` flag. For example:

```
yarn deploy --network sepolia
yarn verify --network sepolia
```

The source of these scripts can be found in the `scripts` folder of each package. The account used to deploy and verify is derived from the `PRIVATE_KEY` environment variable in `.env` in the repository root.
