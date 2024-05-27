/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const swapERC20Deploys = require('@airswap/swap-erc20/deploys.js')
const { ChainIds, chainLabels } = require('@airswap/utils')
const { getReceiptUrl } = require('@airswap/utils')
const delegateDeploys = require('../deploys.js')
const delegateBlocks = require('../deploys-blocks.js')
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

  console.log(`swapERC20Contract: ${swapERC20Deploys[chainId]}\n`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const delegateFactory = await ethers.getContractFactory('Delegate')
    const delegateContract = await delegateFactory.deploy(
      swapERC20Deploys[chainId]
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, delegateContract.deployTransaction.hash)
    )
    await delegateContract.deployed()

    delegateDeploys[chainId] = delegateContract.address
    fs.writeFileSync(
      './deploys.js',
      prettier.format(
        `module.exports = ${JSON.stringify(delegateDeploys, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    delegateBlocks[chainId] = (
      await delegateContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(delegateBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
      )
    )
    console.log(
      `Deployed: ${delegateDeploys[chainId]} @ ${delegateBlocks[chainId]}`
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
