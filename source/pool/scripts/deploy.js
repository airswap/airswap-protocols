/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds, getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('../deploys.js')
const poolBlocks = require('../deploys-blocks.js')
const poolCommits = require('../deploys-commits.js')
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

  const scale = 10
  const max = 100

  console.log('\nDeploy POOL')

  console.log(`· max    ${max}`)
  console.log(`· scale  ${scale}\n`)

  if (await confirmDeployment(deployer, poolDeploys[ChainIds.MAINNET])) {
    const poolFactory = await ethers.getContractFactory('Pool')
    const poolContract = await poolFactory.deploy(scale, max)
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, poolContract.deployTransaction.hash)
    )
    await poolContract.deployed()

    poolDeploys[chainId] = poolContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(poolDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    poolBlocks[chainId] = (
      await poolContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(poolBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    poolCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(poolCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(`Deployed: ${poolDeploys[chainId]} @ ${poolBlocks[chainId]}`)

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
