# Deployer

This guide walks through the process of deploying contracts to either a private Ethereum network or to a public Ethereum network and verifying contracts on Etherscan. If deploying to a public testnet, the process requires an Ethereum mnemonic phrase, Etherscan API key, and Infura API key.

1. Run `yarn install` from `airswap-protocols/` to ensure dependencies are installed

2. Change directories to `utils/deployer`

3. Create a `.env` file with:

```
MNEMONIC=""
INFURA_API_KEY=""
ETHERSCAN_API_KEY=""

DEVELOPMENT_WETH=""
DEVELOPMENT_STAKE=""

RINKEBY_WETH="0xc778417E063141139Fce010982780140Aa0cD5Ab"
RINKEBY_STAKE="0xCC1CBD4f67cCeb7c001bD4aDF98451237a193Ff8"

MAINNET_WETH="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
MAINNET_STAKE="0x27054b13b1b798b345b591a4d22e6562d47ea75a"
```

- Fill in MNEMONIC, INFURA_API_KEY, and ETHERSCAN_API_KEY with your values.
- `<network>_STAKE` expects an ERC20 token.
- `<network>_WETH` expects a contract that can take in ETH and transform the value into an ERC20 token.
- Samples of both these contracts can be found within @airswap/tokens.

\*_Note, the `MAINNET_STAKE` and `RINKEBY_STAKE` are AST ERC20 Tokens on those networks_

\*_Note, the `MAINNET_WETH` and `RINKEBY_WETH` are WETH ERC20 Tokens on those networks_

3. Update `migrations/1_initial_migration.js` with correct deployment order

4. run `yarn clean` to remove any prior`./build` and `./flattened` folders

5. run `yarn migrate --network <desired_network>`

If looking to verify on a network besides `development`, one can append the verification commands for the contracts that wish to be verified

```
yarn migrate --network mainnet && sleep 40 && yarn verify Types Wrapper DelegateFactory Indexer Swap TransferHandlerRegistry ERC1155TransferHandler ERC20TransferHandler ERC721TransferHandler KittyCoreTransferHandler flatten/Flattened.sol --network mainnet
```
