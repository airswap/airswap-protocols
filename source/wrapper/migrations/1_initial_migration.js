const Wrapper = artifacts.require('Wrapper')

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    deployer.deploy(Wrapper, '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078', '0xc778417e063141139fce010982780140aa0cd5ab')
  }
}
