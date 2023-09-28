/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { ChainIds, chainNames } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const swapERC20Deploys = require('../deploys.js')
const swapERC20Blocks = require('../deploys-blocks.js')

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

  const protocolFeeWallet = poolDeploys[chainId]
  const stakingContract = stakingDeploys[chainId]
  const protocolFee = 7
  const protocolFeeLight = 7
  const discountScale = 10
  const discountMax = 100

  console.log(`Fee recipient: ${protocolFeeWallet}`)
  console.log(`Staking contract: ${stakingContract}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const swapFactory = await ethers.getContractFactory('SwapERC20')
    const swapContract = await swapFactory.deploy(
      protocolFee,
      protocolFeeLight,
      protocolFeeWallet,
      discountScale,
      discountMax,
      stakingContract
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, swapContract.deployTransaction.hash)
    )
    await swapContract.deployed()

    swapERC20Deploys[chainId] = swapContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapERC20Deploys, null, '\t')}`,
        { ...config, parser: 'babel' }
      )
    )
    swapERC20Blocks[chainId] = (
      await swapContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(swapERC20Blocks, null, '\t')}`,
        { ...config, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${swapERC20Deploys[chainId]} @ ${swapERC20Blocks[chainId]}`
    )

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
