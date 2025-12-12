/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const delegateDeploys = require('../deploys.js')
const swapERC20Deploys = require('@airswap/swap-erc20/deploys.js')
const { chainNames } = require('@airswap/utils')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  console.log(`Verifying on ${chainNames[chainId]}`)
  await run('verify:verify', {
    address: delegateDeploys[chainId],
    constructorArguments: [swapERC20Deploys[chainId]],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
