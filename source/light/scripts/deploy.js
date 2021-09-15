/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer Address: ${deployer.address}`)

  // Light Deploy
  const feeWallet = '0x7296333e1615721f4Bd9Df1a3070537484A50CF8'
  const fee = 30
  const lightFactory = await ethers.getContractFactory('Light')
  const lightContract = await lightFactory.deploy(feeWallet, fee)
  await lightContract.deployed()
  console.log(`Light Address: ${lightContract.address}`)

  console.log('Waiting to verify...')
  await new Promise(r => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: lightContract.address,
    constructorArguments: [feeWallet, fee],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
