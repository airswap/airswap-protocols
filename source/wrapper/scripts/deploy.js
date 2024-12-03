/* eslint-disable no-console */
const fs = require('node:fs')
const prettier = require('prettier')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds, getReceiptUrl } = require('@airswap/utils')
const swapDeploys = require('@airswap/swap-erc20/deploys.js')
const wrapperDeploys = require('../deploys.js')
const wrapperBlocks = require('../deploys-blocks.js')
const wrapperCommits = require('../deploys-commits.js')
const wethDeploys = require('../deploys-weth.js')
const { confirmDeployment } = require('../../../scripts/deployer-info')

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

  const swapERC20Address = swapDeploys[chainId]
  const wrappedTokenAddress = wethDeploys[chainId]

  if (!wrappedTokenAddress) {
    console.log('Wrapped token not found for selected network.')
    return
  }

  console.log('\nDeploy WRAPPER')

  console.log(`· swapERC20Address     ${swapERC20Address}`)
  console.log(`· wrappedTokenAddress  ${wrappedTokenAddress}\n`)

  if (await confirmDeployment(deployer, wrapperDeploys[ChainIds.MAINNET])) {
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
        { ...prettierConfig, parser: 'babel' }
      )
    )
    wrapperBlocks[chainId] = (
      await wrapperContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(wrapperBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    wrapperCommits[chainId] = require('node:child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim()
    fs.writeFileSync(
      './deploys-commits.js',
      prettier.format(
        `module.exports = ${JSON.stringify(wrapperCommits, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
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
