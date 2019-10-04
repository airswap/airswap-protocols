const DelegateFactory = artifacts.require('DelegateFactory')

module.exports = deployer => {
  deployer.deploy(DelegateFactory)
}
