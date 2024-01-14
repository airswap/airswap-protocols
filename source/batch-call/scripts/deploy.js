/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { ChainIds, chainNames, chainLabels } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const batchCallDeploys = require('../deploys.js')
const batchCallBlocks = require('../deploys-blocks.js')

async function main() {
  await run('compile')
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

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const prettierConfig = await prettier.resolveConfig('../deploys.js')
    const batchFactory = await ethers.getContractFactory('BatchCall')
    const batchCallContract = await batchFactory.deploy()
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, batchCallContract.deployTransaction.hash)
    )
    await batchCallContract.deployed()

    batchCallDeploys[chainId] = batchCallContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(batchCallDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    batchCallBlocks[chainId] = (
      await batchCallContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(batchCallBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${batchCallDeploys[chainId]} @ ${batchCallBlocks[chainId]}`
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