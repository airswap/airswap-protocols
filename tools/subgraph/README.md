# AirSwap Subgraph
ID: `Qma3GJn9Wucuo3AaJMQBmLXyiooiWNcwVrGUWWxTkiGtoD`

## Prerequisites
* Install `ganache-cli` globally with npm or yarn
  * https://www.npmjs.com/package/ganache-cli
* Install Graph CLI globally with npm or yarn
  * https://www.npmjs.com/package/@graphprotocol/graph-cli
* Clone graph node:
  * `git clone https://github.com/graphprotocol/graph-node/`


## Deploying locally
1. Start ganache: `yarn ganache -h 0.0.0.0`
1. From `airswap-protocols/tools/deployer` run `yarn flatten contracts/Imports.sol && yarn cp_migration_flat && truffle compile` to generate abis
1. In another window run local integration tests and collect deployed contract addresses
1. Update `config/development.json` with deployed contract addresses
1. In another window, start the Graph Node: `cd graph-node/docker; docker-compose up` 
1. From `airswap-protocols/tools/subgraph/` run `yarn prepare:development && yarn codegen && yarn remove-local; yarn create-local; yarn deploy-local`
1. Run queries against the endpoint at the end of the previous step

## Deploying to hosted service
1. Authenticate against with ` graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>`
1. From `airswap-protocols/tools/deployer` run `yarn flatten contracts/Imports.sol && yarn cp_migration_flat && truffle compile` to generate abis
1. From `airswap-protocols/tools/subgraph/` run `yarn prepare:development && yarn codegen && yarn remove-local; yarn create-local; yarn deploy-local`
1. Wait for the hosted service to index the blockchain (this can take anywhere from minutes to hours)
1. Run queries against the endpoint at the end of the previous step

## Hosted Service Queries: 
HTTP: `https://api.thegraph.com/subgraphs/name/airswap/airswap`

Subscriptions (WS): 
`wss://api.thegraph.com/subgraphs/name/airswap/airswap`


Visit the Playground [here](https://thegraph.com/explorer/subgraph/airswap/airswap?selected=playground)

## Other

Have requests for updating the schema or mappings? Join us in our [discord](https://discordapp.com/invite/ecQbV7H)!