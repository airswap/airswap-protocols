const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

module.exports = async (deployer, network) => {
  if (network == 'mainnet') {
    // fill in the address of this contract
    const TYPES_ADDRESS = '0xCC73ab6c4DF2CA31Eb2a9f6c74dfCED6dF35307a'
    let types = await Types.at(TYPES_ADDRESS)
    await Swap.link("Types", types.address)
    await deployer.deploy(Swap)
  }
}