const CryptoKittyAsset = artifacts.require('CryptoKittyAsset')
const ERC20Asset = artifacts.require('ERC20Asset')
const ERC721Asset = artifacts.require('ERC721Asset')
const USDTAsset = artifacts.require('USDTAsset')
const TokenRegistry = artifacts.require('TokenRegistry')

module.exports = deployer => {
  deployer.deploy(CryptoKittyAsset)
  deployer.deploy(ERC20Asset)
  deployer.deploy(ERC721Asset)
  deployer.deploy(USDTAsset)

  // add all 4 of these contracts into the TokenRegistry
  TokenRegistry.addToRegistry('0x9a20483d', CryptoKittyAsset)
  TokenRegistry.addToRegistry('0x277f8169', ERC20Asset)
  TokenRegistry.addToRegistry('0x80ac58cd', ERC721Asset)
  TokenRegistry.addToRegistry('', USDTAsset)
}
