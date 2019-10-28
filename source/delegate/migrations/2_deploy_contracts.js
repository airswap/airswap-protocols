const Delegate = artifacts.require('Delegate')
const Swap = artifacts.require('@airswap/swap/contracts/Swap.sol')
const Types = artifacts.require('@airswap/types/contracts/Types.sol')
const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require(
  '@airswap/tokens/contracts/FungibleToken.sol'
)

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = async(deployer) => {
  await deployer.deploy(Types)
  await deployer.link(Types, Swap)
  await deployer.deploy(Swap)
  let swap = await Swap.deployed();
  await deployer.deploy(FungibleToken)
  let token = await FungibleToken.deployed();
  await deployer.deploy(Indexer, token.address)
  let indexer = await Indexer.deployed();
  await deployer.deploy(Delegate, swap.address, indexer.address, EMPTY_ADDRESS, EMPTY_ADDRESS)
}
