const MakerDelegateFactory = artifacts.require('MakerDelegateFactory')

module.exports = deployer => {
  deployer.deploy(MakerDelegateFactory)
}
