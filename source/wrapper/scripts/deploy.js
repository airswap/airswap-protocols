/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const swapDeploys = require('@airswap/swap-erc20/deploys.js')
const wrapperDeploys = require('../deploys.js')
const wethDeploys = require('../deploys-weth.js')
const { chainNames } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')

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

  const swapAddress = swapDeploys[chainId]
  const wrappedTokenAddress = wethDeploys[chainId]

  console.log(`Swap: ${swapAddress}`)
  console.log(`Wrapped: ${wrappedTokenAddress}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const wrapperFactory = await ethers.getContractFactory('Wrapper')
    const wrapperContract = await wrapperFactory.deploy(
      swapAddress,
      wrappedTokenAddress
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, wrapperContract.deployTransaction.hash)
    )
    await wrapperContract.deployed()
    console.log(`Deployed: ${wrapperContract.address}`)

    wrapperDeploys[chainId] = wrapperContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(wrapperDeploys, null, '\t')}`
    )
    console.log('Updated deploys.js')

    console.log(
      `\nVerify with "yarn verify --network ${chainNames[
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
