/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainNames, chainLabels, ChainIds } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const adapterDeploys = require('../deploys-adapters.js')
const adapterBlocks = require('../deploys-adapters-blocks.js')

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

  const adapters = ['ERC20Adapter', 'ERC721Adapter', 'ERC1155Adapter']

  console.log(`\nadapters: ${JSON.stringify(adapters)}`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const blocks = []
    for (let i = 0; i < adapters.length; i++) {
      const adapterContract = await (
        await ethers.getContractFactory(adapters[i])
      ).deploy({
        gasPrice,
      })
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
        { ...config, parser: 'babel' }
      )
    )
    adapterBlocks[chainId] = blocks
    fs.writeFileSync(
      './deploys-adapters-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(adapterBlocks, null, '\t')}`,
        { ...config, parser: 'babel' }
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
