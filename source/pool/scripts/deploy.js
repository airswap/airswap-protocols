/* eslint-disable no-console */
const fs = require('fs')
const prettier = require('prettier')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainLabels, ChainIds } = require('@airswap/utils')
const { getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('../deploys.js')
const poolBlocks = require('../deploys-blocks.js')
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

  const scale = 10
  const max = 100

  console.log(`scale: ${scale}`)
  console.log(`max: ${max}`)

  const targetAddress = await displayDeployerInfo(deployer)
  const mainnetAddress = poolDeploys['1']
  const prompt = new Confirm(
    targetAddress === mainnetAddress
      ? 'Proceed to deploy?'
      : 'Mainnet address not matching target address. Proceed to deployment anyways?'
  )
  if (await prompt.run()) {
    const poolFactory = await ethers.getContractFactory('Pool')
    const poolContract = await poolFactory.deploy(scale, max)
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
        { ...prettierConfig, parser: 'babel' }
      )
    )
    poolBlocks[chainId] = (
      await poolContract.deployTransaction.wait()
    ).blockNumber
    fs.writeFileSync(
      './deploys-blocks.js',
      prettier.format(
        `module.exports = ${JSON.stringify(poolBlocks, null, '\t')}`,
        { ...prettierConfig, parser: 'babel' }
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
