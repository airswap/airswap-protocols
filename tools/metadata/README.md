# Metadata

Token Metadata Tools for AirSwap Developers

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- About → https://about.airswap.io/
- Website → https://www.airswap.io/
- Twitter → https://twitter.com/airswap
- Chat → https://chat.airswap.io/

## Usage

Add the package to your project:

```console
yarn add @airswap/metadata
```

Import into your application:

```TypeScript
import TokenMetadata from '@airswap/metadata';
import * as ethers from 'ethers';

const provider = ethers.getDefaultProvider('mainnet');
const metadata = new TokenMetadata(provider);
const tokens = await metadata.fetchKnownTokens();
```

## Commands

| Command        | Description                             |
| :------------- | :-------------------------------------- |
| `yarn`         | Install dependencies                    |
| `yarn clean`   | Delete the contract `build` folder      |
| `yarn compile` | Compile all contracts to `build` folder |
