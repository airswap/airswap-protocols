/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds, getReceiptUrl } = require('@airswap/utils')
const adapterDeploys = require('../deploys-adapters.js')
const adapterBlocks = require('../deploys-adapters-blocks.js')
const adapterCommits = require('../deploys-adapters-commits.js')
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

  const adapters = ['ERC20Adapter', 'ERC721Adapter', 'ERC1155Adapter']

  console.log('\nDeploy ADAPTERS')

  console.log(`· adapters  ${adapters.join(', ')}\n`)

  if (await confirmDeployment(deployer, adapterDeploys[ChainIds.MAINNET][0])) {
    const blocks = []
    for (let i = 0; i < adapters.length; i++) {
      const adapterContract = await (
        await ethers.getContractFactory(adapters[i])
      ).deploy()
      console.log(
        `Deploying ${adapters[i]}...`,
        getReceiptUrl(chainId, adapterContract.deployTransaction.hash)
      )
      await adapterContract.deployed()
      blocks[i] = (await adapterContract.deployTransaction.wait()).blockNumber
      adapters[i] = adapterContract.address
    }

    adapterDeploys[chainId] = adapters
    fs.writeFileSync(
      './deploys-adapters.js',
      prettier.format(
        `module.exports = ${JSON.stringify(adapterDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    adapterBlocks[chainId] = blocks
    fs.writeFileSync(
      './deploys-adapters-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(adapterBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    adapterCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-adapters-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(adapterCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `\nVerify with "yarn verify-adapters --network ${chainLabels[
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
