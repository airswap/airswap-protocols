const Types = artifacts.require('Types')
module.exports = deployer => {
  if (network == 'rinkeby') {
    deployer.deploy(Types)
  }
}
