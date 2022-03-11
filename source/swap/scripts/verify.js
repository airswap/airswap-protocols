/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const stakingDeploys = require('@airswap/staking/deploys.js')
const converterDeploys = require('@airswap/converter/deploys.js')
const { chainNames } = require('@airswap/constants')
const swapDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const protocolFeeWallet = converterDeploys[chainId]
  const stakingContract = stakingDeploys[chainId]
  const protocolFee = 7
  const protocolFeeLight = 7
  const rebateScale = 10
  const rebateMax = 100

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: swapDeploys[chainId],
    constructorArguments: [
      protocolFee,
      protocolFeeLight,
      protocolFeeWallet,
      rebateScale,
      rebateMax,
      stakingContract,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
