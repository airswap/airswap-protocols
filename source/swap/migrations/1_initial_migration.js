const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

module.exports = async (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the address of this contract
    const TYPES_ADDRESS = ''
    let types = await Types.at(TYPES_ADDRESS)
    await Swap.link('Types', types.address)
    await deployer.deploy(Swap)
  }
}
