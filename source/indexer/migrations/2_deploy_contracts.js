require('dotenv').config()
const Indexer = artifacts.require('Indexer')

module.exports = async function(deployer) {
  await deployer.deploy(Indexer, process.env.RINKEBY_AST_TOKEN);
}
