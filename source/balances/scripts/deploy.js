/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainNames } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const swapDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const gasPrice = await deployer.getGasPrice()

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const balanceCheckerFactory = await ethers.getContractFactory(
      'BalanceChecker'
    )
    const balanceCheckerContract = await balanceCheckerFactory.deploy()
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, balanceCheckerContract.deployTransaction.hash)
    )
    await balanceCheckerContract.deployed()
    console.log(`Deployed: ${balanceCheckerContract.address}`)

    swapDeploys[chainId] = balanceCheckerContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(swapDeploys, null, '\t')}`
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
