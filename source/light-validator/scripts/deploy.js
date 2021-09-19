/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer Address: ${deployer.address}`)

  // Deploy
  const lightAddress = '0x7296333e1615721f4Bd9Df1a3070537484A50CF8'
  const LightValidatorFactory = await ethers.getContractFactory(
    'LightValidator'
  )
  const lightValidator = await LightValidatorFactory.deploy(lightAddress)
  await lightValidator.deployed()
  console.log(`LightValidator Address: ${lightValidator.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: lightValidator.address,
    constructorArguments: [lightAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
