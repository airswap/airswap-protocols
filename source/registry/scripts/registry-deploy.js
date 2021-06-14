/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer Address: ${deployer.address}`)
  const stakingToken = '0x27054b13b1b798b345b591a4d22e6562d47ea75a'
  const obligationCost = 1000000000
  const tokenCost = 1000000
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
