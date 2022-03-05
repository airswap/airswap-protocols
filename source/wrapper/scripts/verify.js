/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const swapDeploys = require('@airswap/swap/deploys.js')
const wrapperDeploys = require('../deploys.js')
const { chainNames, wethAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const swapAddress = swapDeploys[chainId]
  const wethAddress = wethAddresses[chainId]

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: wrapperDeploys[chainId],
    constructorArguments: [swapAddress, wethAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
