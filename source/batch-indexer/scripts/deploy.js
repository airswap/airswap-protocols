/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(deployer.address)
  // const batchIndicesFactory = await ethers.getContractFactory('BatchIndices')
  // const batchIndicies = await batchIndicesFactory.deploy()
  // await batchIndicies.deployed()
  // console.log(`Batch Indices Address: ${batchIndicies.address}`)

  // address: '0x82409EcE9464313EeC2C2edEF75cfF287351CE61'
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
