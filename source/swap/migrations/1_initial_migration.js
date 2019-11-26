const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

module.exports = async (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the address of this contract
    const TYPES_ADDRESS = '0xCE4a46E27986c523d989aD929b42B0e6714C6CC8'
    let types = await Types.at(TYPES_ADDRESS)
    await Swap.link("Types", types.address)
    await deployer.deploy(Swap)
  }
}
