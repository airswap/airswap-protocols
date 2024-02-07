/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds } = require('@airswap/utils')
const { getReceiptUrl } = require('@airswap/utils')
const adapterDeploys = require('../deploys-adapters.js')
const adapterBlocks = require('../deploys-adapters-blocks.js')
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

  const adapters = ['ERC20Adapter', 'ERC721Adapter', 'ERC1155Adapter']
  console.log(`adapters: ${JSON.stringify(adapters)}`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
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
