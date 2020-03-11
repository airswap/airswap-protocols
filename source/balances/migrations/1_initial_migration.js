const Migrations = artifacts.require("Migrations");
const BalanceChecker = artifacts.require('BalanceChecker')

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deploer.deploy(BalanceChecker);
};
