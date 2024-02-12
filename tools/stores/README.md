# Stores

Storage for Indexing

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
yarn add @airswap/stores
```

```console
docker run -p 6379:6379 --name redis-stack redis/redis-stack:latest
```

Import into your application:

```TypeScript
import { Redis } from '@airswap/stores';
const store = new Redis(process.env.REDISCLOUD_URL)
```

## Commands

| Command        | Description                             |
| :------------- | :-------------------------------------- |
| `yarn`         | Install dependencies                    |
| `yarn clean`   | Delete the contract `build` folder      |
| `yarn compile` | Compile all contracts to `build` folder |
| `yarn test`    | Run all tests in the `test` folder      |
