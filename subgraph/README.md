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
1. In another window and within `airswap-protocols`, run `yarn test`
1. In another window and within `graph-node/docker/docker-compose.yml` replace ethereum: `'mainnet:http://host.docker.internal:8545'` with ethereum: `'development:http://host.docker.internal:8545'`
1. Start the graph node from `graph-node/docker` by running `docker-compose up` 
1. From `airswap-protocols/tools/subgraph` run `yarn prepare:development && yarn codegen && yarn remove-local; yarn create-local; yarn deploy-local`
1. Run queries against the endpoint at the end of the previous step

## Deploying to hosted service
1. Authenticate with ` graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>`
1. In another window and within `airswap-protocols`, run `yarn test`
1. From `airswap-protocols/tools/subgraph` run `yarn prepare:mainnet && yarn codegen && yarn remove-local; yarn create-local; yarn deploy`
1. Wait for the hosted service to index the blockchain (this can take anywhere from minutes to hours)
1. Run queries against the endpoint at the end of the previous step

## Hosted Service Queries: 
HTTP: `https://api.thegraph.com/subgraphs/name/airswap/airswap`

Subscriptions (WS): 
`wss://api.thegraph.com/subgraphs/name/airswap/airswap`

Download our Postman Example Queries from `airswap-protocols/tools/subgraph/AirSwap.postman.json`

Visit the Playground [here](https://thegraph.com/explorer/subgraph/airswap/airswap?selected=playground)

## Other

Have requests for updating the schema or mappings? Join us in our [discord](https://discordapp.com/invite/ecQbV7H)!
