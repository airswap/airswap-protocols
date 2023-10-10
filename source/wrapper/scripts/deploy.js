/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const swapDeploys = require('@airswap/swap-erc20/deploys.js')
const wrapperDeploys = require('../deploys.js')
const wrapperBlocks = require('../deploys-blocks.js')
const wethDeploys = require('../deploys-weth.js')
const { ChainIds, chainNames, chainLabels } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')

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

  const swapERC20Address = swapDeploys[chainId]
  const wrappedTokenAddress = wethDeploys[chainId]

  if (!wrappedTokenAddress) {
    console.log('Wrapped token not found for selected network.')
    return
  }

  console.log(`SwapERC20: ${swapERC20Address}`)
  console.log(`Wrapped: ${wrappedTokenAddress}`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const wrapperFactory = await ethers.getContractFactory('Wrapper')
    const wrapperContract = await wrapperFactory.deploy(
      swapERC20Address,
      wrappedTokenAddress,
      {
        gasPrice,
      }
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, wrapperContract.deployTransaction.hash)
    )
    await wrapperContract.deployed()

    wrapperDeploys[chainId] = wrapperContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(wrapperDeploys, null, '\t')}`,
        { ...config, parser: 'babel' }
      )
    )
    wrapperBlocks[chainId] = (
      await wrapperContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(wrapperBlocks, null, '\t')}`,
        { ...config, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${wrapperDeploys[chainId]} @ ${wrapperBlocks[chainId]}`
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
