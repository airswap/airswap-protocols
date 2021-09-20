/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer Address: ${deployer.address}`)

  // Deploy
  const lightAddress = '0xc549a5c701cb6e6cbc091007a80c089c49595468'
  const ValidatorFactory = await ethers.getContractFactory('Validator')
  const Validator = await ValidatorFactory.deploy(lightAddress)
  await Validator.deployed()
  console.log(`Validator Address: ${Validator.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: Validator.address,
    constructorArguments: [lightAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
