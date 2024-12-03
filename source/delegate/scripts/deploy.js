/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')

const { ethers, run } = require('hardhat')
const swapERC20Deploys = require('@airswap/swap-erc20/deploys.js')
const { ChainIds, chainLabels, getReceiptUrl } = require('@airswap/utils')
const delegateDeploys = require('../deploys.js')
const delegateBlocks = require('../deploys-blocks.js')
const delegateCommits = require('../deploys-commits.js')
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

  console.log('\nDeploy DELEGATE')

  console.log(`· swapERC20Contract  ${swapERC20Deploys[chainId]}\n`)

  if (await confirmDeployment(deployer, delegateDeploys[ChainIds.MAINNET])) {
    const delegateFactory = await ethers.getContractFactory('Delegate')
    const delegateContract = await delegateFactory.deploy(
      swapERC20Deploys[chainId]
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, delegateContract.deployTransaction.hash)
    )
    await delegateContract.deployed()

    delegateDeploys[chainId] = delegateContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(delegateDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    delegateBlocks[chainId] = (
      await delegateContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(delegateBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    delegateCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(delegateCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${delegateDeploys[chainId]} @ ${delegateBlocks[chainId]}`
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
