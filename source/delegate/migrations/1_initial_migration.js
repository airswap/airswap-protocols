const DelegateV2Factory = artifacts.require('DelegateV2Factory')
const DelegateV2 = artifacts.require('DelegateV2')

module.exports = async (deployer, network) => {
  // fill in the addresses below
  const SWAP_ADDRESS = ''
  const INDEXER_ADDRESS = ''
  const OWNER_ADDRESS = ''
  const TRADE_WALLET_ADDRESS = ''
  const FACTORY_PROTOCOL = '0x0001'

  if (network == 'mainnet' || network == 'rinkeby') {
    await deployer.deploy(
      DelegateV2Factory,
      SWAP_ADDRESS,
      INDEXER_ADDRESS,
      FACTORY_PROTOCOL
    )
    await deployer.deploy(
      DelegateV2,
      SWAP_ADDRESS,
      INDEXER_ADDRESS,
      OWNER_ADDRESS,
      TRADE_WALLET_ADDRESS,
      FACTORY_PROTOCOL
    )
  }
}
