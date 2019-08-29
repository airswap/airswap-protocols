const Market = artifacts.require('Market')

module.exports = deployer => {
  deployer.deploy(Market)
}
