const PeerFactory = artifacts.require('PeerFactory')

module.exports = deployer => {
  deployer.deploy(PeerFactory)
}
