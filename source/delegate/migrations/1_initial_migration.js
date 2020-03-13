const DelegateFactory = artifacts.require('DelegateFactory')
const Delegate = artifacts.require('Delegate')

module.exports = async (deployer, network) => {
  // fill in the addresses below
  const SWAP_ADDRESS = ''
  const INDEXER_ADDRESS = ''
  const OWNER_ADDRESS = ''
  const TRADE_WALLET_ADDRESS = ''
  const FACTORY_PROTOCOL = '0x0001'

  if (network == 'mainnet' || network == 'rinkeby') {
    await deployer.deploy(
      DelegateFactory,
      SWAP_ADDRESS,
      INDEXER_ADDRESS,
      FACTORY_PROTOCOL
    )
    await deployer.deploy(
      Delegate,
      SWAP_ADDRESS,
      INDEXER_ADDRESS,
      OWNER_ADDRESS,
      TRADE_WALLET_ADDRESS,
      FACTORY_PROTOCOL
    )
  }
}
