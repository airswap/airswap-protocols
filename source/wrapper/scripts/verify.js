/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const swapERC20Deploys = require('@airswap/swap-erc20/deploys.js')
const wrapperDeploys = require('../deploys.js')
const wethDeploys = require('../deploys-weth.js')
const { chainNames } = require('@airswap/utils')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const swapERC20Address = swapERC20Deploys[chainId]
  const wrappedTokenAddress = wethDeploys[chainId]

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: wrapperDeploys[chainId],
    constructorArguments: [swapERC20Address, wrappedTokenAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
