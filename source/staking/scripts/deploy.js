/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(deployer.address)
  const stakingToken = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const name = 'Staked AST'
  const symbol = 'sAST'
  const duration = 300
  const cliff = 30
  const stakingFactory = await ethers.getContractFactory('Staking')
  const stakingContract = await stakingFactory.deploy(
    stakingToken,
    name,
    symbol,
    duration,
    cliff
  )
  await stakingContract.deployed()
  console.log(`Staking Address: ${stakingContract.address}`)

  await hre.run('verify:verify', {
    address: stakingContract.address,
    constructorArguments: [stakingToken, name, symbol, duration, cliff],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
