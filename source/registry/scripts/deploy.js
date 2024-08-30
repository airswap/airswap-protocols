/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { ChainIds, chainLabels } = require('@airswap/utils')
const { getReceiptUrl } = require('@airswap/utils')
const registryDeploys = require('../deploys.js')
const registryBlocks = require('../deploys-blocks.js')
const registryCommits = require('../deploys-commits.js')
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

  let stakingToken
  let stakingCost
  let supportCost

  if (config[chainId]) {
    ;({ stakingToken, stakingCost, supportCost } = config[chainId])
  } else {
    ;({ stakingToken, stakingCost, supportCost } = config[ChainIds.MAINNET])
  }

  console.log(`stakingToken: ${stakingToken}`)
  console.log(`stakingCost: ${stakingCost}`)
  console.log(`supportCost: ${supportCost}\n`)

  const targetAddress = await displayDeployerInfo(deployer)
  const mainnetAddress = registryDeploys['1']
  const prompt = new Confirm(
    targetAddress === mainnetAddress
      ? 'Proceed to deploy?'
      : 'Contract address would not match current mainnet address. Proceed anyway?'
  )
  if (await prompt.run()) {
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
    registryCommits[chainId] = require('child_process')
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
