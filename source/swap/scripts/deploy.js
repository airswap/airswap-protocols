/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const {
  chainNames,
  chainLabels,
  ChainIds,
  protocolFeeReceiverAddresses,
  ADDRESS_ZERO,
} = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('@airswap/pool/deploys.js')
const swapDeploys = require('../deploys.js')
const swapBlocks = require('../deploys-blocks.js')
const adapterDeploys = require('../deploys-adapters.js')
const config = require('./config.js')

async function main() {
  await run('compile')
  const prettierConfig = await prettier.resolveConfig('../deploys.js')

  const [deployer] = await ethers.getSigners()
  const gasPrice = await deployer.getGasPrice()
  const chainId = await deployer.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }
  if (!adapterDeploys[chainId]) {
    console.log('Adapters must be deployed first.')
    return
  }

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Network: ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)

  let requiredSenderKind
  let protocolFee
  if (config[chainId]) {
    ;({ requiredSenderKind, protocolFee } = config[chainId])
  } else {
    ;({ requiredSenderKind, protocolFee } = config[ChainIds.MAINNET])
  }

  let protocolFeeReceiver = poolDeploys[chainId] || ADDRESS_ZERO
  if (protocolFeeReceiverAddresses[chainId]) {
    protocolFeeReceiver = protocolFeeReceiverAddresses[chainId]
  }

  console.log(`\nadapters: ${JSON.stringify(adapterDeploys[chainId])}`)
  console.log(`requiredSenderKind: ${requiredSenderKind}`)
  console.log(`protocolFee: ${protocolFee}`)
  console.log(`protocolFeeReceiver: ${protocolFeeReceiver}`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const swapFactory = await ethers.getContractFactory('Swap')
    const swapContract = await swapFactory.deploy(
      adapterDeploys[chainId],
      requiredSenderKind,
      protocolFee,
      protocolFeeReceiver,
      {
        gasPrice,
      }
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, swapContract.deployTransaction.hash)
    )
    await swapContract.deployed()

    swapDeploys[chainId] = swapContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    swapBlocks[chainId] = (
      await swapContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(`Deployed: ${swapDeploys[chainId]} @ ${swapBlocks[chainId]}`)

    console.log(
      `\nVerify with "yarn verify --network ${chainLabels[
        chainId
      ].toLowerCase()}"\n`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
