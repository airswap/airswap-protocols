/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { ChainIds, chainNames } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const balancesDeploys = require('../deploys.js')

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

    balancesDeploys[chainId] = balanceCheckerContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(balancesDeploys, null, '\t')}`
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
