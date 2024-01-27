/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { ChainIds, chainLabels, chainNames } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const registryDeploys = require('../deploys.js')
const registryBlocks = require('../deploys-blocks.js')
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
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Network: ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)

  let stakingToken
  let stakingCost
  let supportCost

  if (config[chainId]) {
    ;({ stakingToken, stakingCost, supportCost } = config[chainId])
  } else {
    ;({ stakingToken, stakingCost, supportCost } = config[ChainIds.MAINNET])
  }

  console.log(`\nstakingToken: ${stakingToken}`)
  console.log(`stakingCost: ${stakingCost}`)
  console.log(`supportCost: ${supportCost}\n`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const registryFactory = await ethers.getContractFactory('Registry')
    const registryContract = await registryFactory.deploy(
      stakingToken,
      stakingCost,
      supportCost,
      {
        gasPrice,
      }
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
