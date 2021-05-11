/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(deployer.address)
  const stakingToken = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const obligationCost = 1000
  const tokenCost = 10
  const registryFactory = await ethers.getContractFactory('Registry')
  const registryContract = await registryFactory.deploy(
    stakingToken,
    obligationCost,
    tokenCost
  )
  await registryContract.deployed()
  console.log(`Registry Address: ${registryContract.address}`)

  console.log('Waiting to verify...')
  await new Promise(r => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: registryContract.address,
    constructorArguments: [stakingToken, obligationCost, tokenCost],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
