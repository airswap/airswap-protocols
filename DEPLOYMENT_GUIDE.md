# Deployment Guide

This guide walks through the process of deploying contracts to public Ethereum networks and verifying contracts on Etherscan. The process requires an Ethereum mnemonic phrase, Etherscan API key, and Infura API key. All of these are free to get. All commands should be run out of the root folder of the contract you want to deploy. For example, to deploy Types.sol, run commands within the `source/types` package.

1. Create a .env file with:

```
MNEMONIC=""
INFURA_API_KEY=""
ETHERSCAN_API_KEY=""
```

Fill in these fields with the details you wish to use.

2. Clear the ./build folder so that there are no prior deployments available (i.e. remove all .json that were within ./build)

3. Your truffle-config.js/truffle.js must have a `contracts_directory` pointing to the ./flatten directory. This line is currently commented out in each of the `truffle-config.js` files within the repo. Just uncomment this line.

4. In `package.json`, ensure the following 4 commands are present:

```
"cp_migration_flat": "mkdir flatten/; cp contracts/Migrations.sol flatten/",
"flatten": "truffle run flatten",
"migrate": "yarn cp_migration_flat; truffle migrate --skip-dry-run",
"verify": "truffle run verify"
```

5. Also in the _root_ package.json, ensure the following dependencies are present as devDependencies:

```
    "truffle-flatten": "^1.0.5",
    "@truffle/hdwallet-provider": "^1.0.17",
    "truffle-verify": "^1.0.3"
```

6. Run `yarn install` to ensure these dependencies are installed

7. `migrations/1_initial_migration.js` is what is going to be deployed for a given module of contracts, as defined by Truffle. The file should only therefore deploy the contract you wish to deploy in the current repository. For example, for Types, it would look as follows

```
const Types = artifacts.require('Types')
module.exports = deployer => {
  deployer.deploy(Types)
}
```

Note:

- Migrations.sol is not deployed here.
- The migrations files are set up to deploy correctly for Rinkeby. However, make sure you fill in any required addresses, these are specified as empty constants in the migrations currently. e.g. `const TYPES_ADDRESS = ''` would need to be filled in with the address of Types.
- To deploy on a network other than Rinkeby, update the `if` statement in the migrations files to check for the correct network.

8. Deploy! Replace the word `Types` in commands 1 and 4 with the name of the contract being deployed

```
yarn flatten contracts/Types.sol
yarn migrate --network rinkeby
sleep 20
yarn verify Types flatten/Flattened.sol --network rinkeby
```

Or these can be chained together:

```
yarn flatten contracts/Types.sol && yarn migrate --network rinkeby && sleep 20 && yarn verify Types flatten/Flattened.sol --network rinkeby
```
