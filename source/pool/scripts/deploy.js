/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainLabels, chainNames, ChainIds } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('../deploys.js')
const poolBlocks = require('../deploys-blocks.js')

async function main() {
  await run('compile')
  const config = await prettier.resolveConfig('../deploys.js')

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

  const scale = 10
  const max = 100

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const poolFactory = await ethers.getContractFactory('Pool')
    const poolContract = await poolFactory.deploy(scale, max, {
      gasPrice,
    })
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
        { ...config, parser: 'babel' }
      )
    )
    poolBlocks[chainId] = (
      await poolContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(poolBlocks, null, '\t')}`,
        { ...config, parser: 'babel' }
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
