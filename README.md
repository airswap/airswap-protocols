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

## Packages

| Package                                                 | Version                                                                                                                   | Description                   |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| [`@airswap/swap`](/source/swap)                         | [![npm](https://img.shields.io/npm/v/@airswap/swap)](https://www.npmjs.com/package/@airswap/swap)                         | Atomic Token Swap             |
| [`@airswap/swap-erc20`](/source/swap-erc20)             | [![npm](https://img.shields.io/npm/v/@airswap/swap-erc20)](https://www.npmjs.com/package/@airswap/swap-erc20)             | Atomic Token Swap (ERC20)     |
| [`@airswap/maker-registry`](/source/maker-registry)     | [![npm](https://img.shields.io/npm/v/@airswap/maker-registry)](https://www.npmjs.com/package/@airswap/maker-registry)     | Maker Discovery               |
| [`@airswap/indexer-registry`](/source/indexer-registry) | [![npm](https://img.shields.io/npm/v/@airswap/indexer-registry)](https://www.npmjs.com/package/@airswap/indexer-registry) | Indexer Discovery             |
| [`@airswap/staking`](/source/staking)                   | [![npm](https://img.shields.io/npm/v/@airswap/staking)](https://www.npmjs.com/package/@airswap/staking)                   | Staking for Participants      |
| [`@airswap/pool`](/source/pool)                         | [![npm](https://img.shields.io/npm/v/@airswap/pool)](https://www.npmjs.com/package/@airswap/pool)                         | Rewards Pool for Participants |

## Commands

| Command           | Description                               |
| :---------------- | :---------------------------------------- |
| `yarn compile`    | Compile all contracts to `build` folders. |
| `yarn clean`      | Delete all contract `build` folders.      |
| `yarn test`       | Run all contract tests in `test` folders. |
| `yarn lint:fix`   | Run eslint for all JavaScript code.       |
| `yarn pretty:fix` | Run prettier for all JavaScript code.     |

## Deploying Contracts

Each package in `source` has commands `yarn deploy` and `yarn verify`. Each command takes a `--network` flag. For example:

```
yarn deploy --network goerli
yarn verify --network goerli
```

The account used to deploy and verify is derived from the `MNEMONIC` environment variable in `.env` in the repository root. The source of these scripts can be found in the `scripts` folder of each package.
