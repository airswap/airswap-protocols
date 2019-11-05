const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')

module.exports = async (deployer) => {
  if (network == 'rinkeby') {
    let types = await Types.at('0x1a1ec25DC08e98e5E93F1104B5e5cdD298707d31')
    await Swap.link("Types", types.address)
    await deployer.deploy(Swap)
  }
}