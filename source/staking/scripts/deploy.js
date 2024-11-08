/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds, getReceiptUrl } = require('@airswap/utils')
const stakingDeploys = require('../deploys.js')
const stakingBlocks = require('../deploys-blocks.js')
const stakingCommits = require('../deploys-commits.js')
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

  const {
    name,
    symbol,
    stakingToken,
    stakingDuration,
    minDurationChangeDelay,
  } = config[chainId]

  console.log('\nDeploy STAKING')

  console.log(`· name                    ${name}`)
  console.log(`· symbol                  ${symbol}`)
  console.log(`· stakingToken            ${stakingToken}`)
  console.log(`· stakingDuration         ${stakingDuration}`)
  console.log(`· minDurationChangeDelay  ${minDurationChangeDelay}\n`)

  if (await confirmDeployment(deployer, stakingDeploys[ChainIds.MAINNET])) {
    const stakingFactory = await ethers.getContractFactory('Staking')
    const stakingContract = await stakingFactory.deploy(
      name,
      symbol,
      stakingToken,
      stakingDuration,
      minDurationChangeDelay
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, stakingContract.deployTransaction.hash)
    )
    await stakingContract.deployed()

    stakingDeploys[chainId] = stakingContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(stakingDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    stakingBlocks[chainId] = (
      await stakingContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(stakingBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    stakingCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(stakingCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${stakingDeploys[chainId]} @ ${stakingBlocks[chainId]}`
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
