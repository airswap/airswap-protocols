/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const {
  chainLabels,
  ChainIds,
  protocolFeeReceiverAddresses,
  ADDRESS_ZERO,
} = require('@airswap/utils')
const { getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('@airswap/pool/deploys.js')
const swapDeploys = require('../deploys.js')
const swapBlocks = require('../deploys-blocks.js')
const adapterDeploys = require('../deploys-adapters.js')
const config = require('./config.js')
const { displayDeployerInfo } = require('../../../scripts/deployer-info')

async function main() {
  await run('compile')
  const prettierConfig = await prettier.resolveConfig('../deploys.js')
  const [deployer] = await ethers.getSigners()
  const chainId = await deployer.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }
  await displayDeployerInfo(deployer)

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

  console.log(`adapters: ${JSON.stringify(adapterDeploys[chainId])}`)
  console.log(`requiredSenderKind: ${requiredSenderKind}`)
  console.log(`protocolFee: ${protocolFee}`)
  console.log(`protocolFeeReceiver: ${protocolFeeReceiver}`)

  const targetAddress = await displayDeployerInfo(deployer)
  const mainnetAddress = swapDeploys['1']
  const prompt = new Confirm(
    targetAddress === mainnetAddress
      ? 'Proceed to deploy?'
      : 'Mainnet address not matching target address. Proceed to deployment anyways?'
  )
  if (await prompt.run()) {
    const swapFactory = await ethers.getContractFactory('Swap')
    const swapContract = await swapFactory.deploy(
      adapterDeploys[chainId],
      requiredSenderKind,
      protocolFee,
      protocolFeeReceiver
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
