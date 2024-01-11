/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const {
  chainNames,
  protocolFeeReceiverAddresses,
} = require('@airswap/constants')
const swapERC20Deploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  let protocolFeeReceiver = poolDeploys[chainId]
  if (protocolFeeReceiverAddresses[chainId]) {
    protocolFeeReceiver = protocolFeeReceiverAddresses[chainId]
  }
  const protocolFee = 7
  const protocolFeeLight = 7
  const bonusScale = 10
  const bonusMax = 100

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: swapERC20Deploys[chainId],
    constructorArguments: [
      protocolFee,
      protocolFeeLight,
      protocolFeeReceiver,
      bonusScale,
      bonusMax,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
