/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const {
  ChainIds,
  chainLabels,
  protocolFeeReceiverAddresses,
  getReceiptUrl,
} = require('@airswap/utils')
const swapERC20Deploys = require('../deploys.js')
const swapERC20Blocks = require('../deploys-blocks.js')
const swapERC20Commits = require('../deploys-commits.js')
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

  console.log('\nDeploy SWAPERC20')

  console.log(`· protocolFee          ${protocolFee}`)
  console.log(`· protocolFeeLight     ${protocolFeeLight}`)
  console.log(`· protocolFeeReceiver  ${protocolFeeReceiver}\n`)

  if (await confirmDeployment(deployer, swapERC20Deploys[ChainIds.MAINNET])) {
    const swapFactory = await ethers.getContractFactory('SwapERC20')
    const swapContract = await swapFactory.deploy(
      protocolFee,
      protocolFeeLight,
      protocolFeeReceiver,
      bonusScale,
      bonusMax
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, swapContract.deployTransaction.hash)
    )
    await swapContract.deployed()

    swapERC20Deploys[chainId] = swapContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapERC20Deploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    swapERC20Blocks[chainId] = (
      await swapContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapERC20Blocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    swapERC20Commits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapERC20Commits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${swapERC20Deploys[chainId]} @ ${swapERC20Blocks[chainId]}`
    )

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
