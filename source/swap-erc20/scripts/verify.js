/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const {
  ChainIds,
  chainNames,
  protocolFeeReceiverAddresses,
} = require('@airswap/utils')
const swapERC20Deploys = require('../deploys.js')
const config = require('./config.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  let protocolFeeReceiver = poolDeploys[chainId]
  if (protocolFeeReceiverAddresses[chainId]) {
    protocolFeeReceiver = protocolFeeReceiverAddresses[chainId]
  }

  let protocolFee
  let protocolFeeLight
  let bonusScale
  let bonusMax

  if (config[chainId]) {
    ;({ protocolFee, protocolFeeLight, bonusScale, bonusMax } = config[chainId])
  } else {
    ;({ protocolFee, protocolFeeLight, bonusScale, bonusMax } =
      config[ChainIds.MAINNET])
  }

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
