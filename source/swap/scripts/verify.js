/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const {
  chainNames,
  protocolFeeReceiverAddresses,
} = require('@airswap/constants')
const swapDeploys = require('../deploys.js')
const adapterDeploys = require('../deploys-adapters.js')
const config = require('./config.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  let requiredSenderKind
  let protocolFee
  if (config[chainId]) {
    ;({ requiredSenderKind, protocolFee } = config[chainId])
  } else {
    ;({ requiredSenderKind, protocolFee } = config[ChainIds.MAINNET])
  }

  let protocolFeeReceiver = poolDeploys[chainId]
  if (protocolFeeReceiverAddresses[chainId]) {
    protocolFeeReceiver = protocolFeeReceiverAddresses[chainId]
  }

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)

  await run('verify:verify', {
    address: swapDeploys[chainId],
    constructorArguments: [
      adapterDeploys[chainId],
      requiredSenderKind,
      protocolFee,
      protocolFeeReceiver,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
