/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const { chainNames } = require('@airswap/utils')
const batchCallDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: batchCallDeploys[chainId],
    constructorArguments: [],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
