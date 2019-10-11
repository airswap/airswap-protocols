const PartialKittyCoreAsset = artifacts.require('PartialKittyCoreAsset')
const ERC20Asset = artifacts.require('ERC20Asset')
const ERC721Asset = artifacts.require('ERC721Asset')
const USDTAsset = artifacts.require('USDTAsset')
const TokenRegistry = artifacts.require('TokenRegistry')

module.exports = deployer => {
  deployer.deploy(PartialKittyCoreAsset)
  deployer.deploy(ERC20Asset)
  deployer.deploy(ERC721Asset)
  deployer.deploy(USDTAsset)
}
