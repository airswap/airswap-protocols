/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer Address: ${deployer.address}`)
  const scale = 10
  const max = 100
  const poolFactory = await ethers.getContractFactory('Pool')
  const poolContract = await poolFactory.deploy(scale, max)
  await poolContract.deployed()
  console.log(`Registry Address: ${poolContract.address}`)

  console.log('Waiting to verify...')
  await new Promise(r => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: poolContract.address,
    constructorArguments: [scale, max],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
