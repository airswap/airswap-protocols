/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const { ChainIds, chainLabels, getReceiptUrl } = require('@airswap/utils')
const registryDeploys = require('../deploys.js')
const registryBlocks = require('../deploys-blocks.js')
const registryCommits = require('../deploys-commits.js')
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

  let stakingToken
  let stakingCost
  let supportCost

  if (config[chainId]) {
    ;({ stakingToken, stakingCost, supportCost } = config[chainId])
  } else {
    ;({ stakingToken, stakingCost, supportCost } = config[ChainIds.MAINNET])
  }

  console.log('\nDeploy REGISTRY')

  console.log(`· stakingCost   ${stakingCost}`)
  console.log(`· supportCost   ${supportCost}`)
  console.log(`· stakingToken  ${stakingToken}\n`)

  if (await confirmDeployment(deployer, registryDeploys)) {
    const registryFactory = await ethers.getContractFactory('Registry')
    const registryContract = await registryFactory.deploy(
      stakingToken,
      stakingCost,
      supportCost
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, registryContract.deployTransaction.hash)
    )
    await registryContract.deployed()

    registryDeploys[chainId] = registryContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(registryDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    registryBlocks[chainId] = (
      await registryContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(registryBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    registryCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(registryCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${registryDeploys[chainId]} @ ${registryBlocks[chainId]}`
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
