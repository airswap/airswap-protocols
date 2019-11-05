const DelegateFactory = artifacts.require("DelegateFactory");

module.exports = (deployer, network) => {
  if (network == 'rinkeby') {
    deployer.deploy(DelegateFactory, '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078', '0x6299e178413d6b7903c365dda1d4f23e37868b25')
  }
};
