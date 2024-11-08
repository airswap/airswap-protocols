/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const {
  chainLabels,
  ChainIds,
  protocolFeeReceiverAddresses,
  ADDRESS_ZERO,
  getReceiptUrl,
} = require('@airswap/utils')
const poolDeploys = require('@airswap/pool/deploys.js')
const swapDeploys = require('../deploys.js')
const swapBlocks = require('../deploys-blocks.js')
const swapCommits = require('../deploys-commits.js')
const adapterDeploys = require('../deploys-adapters.js')
const config = require('./config.js')
const { confirmDeployment } = require('../../../scripts/deployer-info')

async function main() {
  await run('compile')
  const prettierConfig = await prettier.resolveConfig('../deploys.js')
  const [deployer] = await ethers.getSigners()
  const chainId = await deployer.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }

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

  console.log('\nDeploy SWAP')

  console.log(`· adapters             ${adapterDeploys[chainId].join(', ')}`)
  console.log(`· protocolFee          ${protocolFee}`)
  console.log(`· requiredSenderKind   ${requiredSenderKind}`)
  console.log(`· protocolFeeReceiver  ${protocolFeeReceiver}\n`)

  if (await confirmDeployment(deployer, swapDeploys)) {
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
    swapCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapCommits, null, '\t')}`,
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
