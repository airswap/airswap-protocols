/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const converterDeploys = require('../deploys.js')
const {
  chainNames,
  wethAddresses,
  uniswapRouterAddress,
} = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const wethAddress = wethAddresses[chainId]
  const poolAddress = poolDeploys[chainId]

  const payees = [poolAddress]
  const shares = [100]
  const triggerFee = 0

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: converterDeploys[chainId],
    constructorArguments: [
      wethAddress,
      wethAddress,
      uniswapRouterAddress,
      triggerFee,
      payees,
      shares,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
