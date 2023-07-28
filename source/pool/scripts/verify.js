/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('../deploys.js')
const { chainNames } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const scale = 10
  const max = 100

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: poolDeploys[chainId],
    constructorArguments: [scale, max],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
