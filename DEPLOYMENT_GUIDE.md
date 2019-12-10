# Deployment Guide

This guide walks through the process of deploying contracts to public Ethereum networks and verifying contracts on Etherscan. The process requires an Ethereum mnemonic phrase, Etherscan API key, and Infura API key. All of these are free to get. All commands should be run out of the `utils/deployer` folder. 

1. Run `yarn install` from `airswap-protocols/` to ensure dependencies are installed

2. Change directories to `utils/deployer`

2. Create a `.env` file with:

```
MNEMONIC=""
INFURA_API_KEY=""
ETHERSCAN_API_KEY=""

MAINNET_WETH="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
MAINNET_AST="0x27054b13b1b798b345b591a4d22e6562d47ea75a"

RINKEBY_WETH="0xc778417E063141139Fce010982780140Aa0cD5Ab"
RINKEBY_AST="0xCC1CBD4f67cCeb7c001bD4aDF98451237a193Ff8"

DEVELOPMENT_WETH="FILL_WITH_ERC20"
DEVELOPMENT_AST="FILL_WITH_ERC20"
```
Fill in these fields with the details you wish to use.

3. Update `migrations/1_initial_migration.js` with correct deployment order

4. run `yarn clean` to remove any prior`./build` and `./flattened` folders

5. run `yarn migrate --network <desired_network>`

if looking to verify on a network besides `development`, one append the verification commands for the contracts that wish to be verified
```
yarn migrate --network rinkeby && sleep 40 && yarn verify Types Wrapper DelegateFactory Indexer Swap flatten/Flattened.sol --network rinkeby
```



