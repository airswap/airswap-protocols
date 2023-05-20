/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const stakingDeploys = require('../deploys.js')

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

  const name = 'Staked AST'
  const symbol = 'sAST'
  const stakingToken = stakingTokenAddresses[chainId]
  const stakingDuration = 60 * 60 * 24 * 7 * 20 // Twenty Weeks
  const minDurationChangeDelay = 60 * 60 * 24 * 7 // One Week

  console.log(`\nname: ${name}`)
  console.log(`symbol: ${symbol}`)
  console.log(`stakingToken: ${stakingToken}`)
  console.log(`stakingDuration: ${stakingDuration}`)
  console.log(`minDurationChangeDelay: ${minDurationChangeDelay}\n`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const stakingFactory = await ethers.getContractFactory('Staking')
    const stakingContract = await stakingFactory.deploy(
      name,
      symbol,
      stakingToken,
      stakingDuration,
      minDurationChangeDelay
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, stakingContract.deployTransaction.hash)
    )
    await stakingContract.deployed()
    console.log(`Deployed: ${stakingContract.address}`)

    stakingDeploys[chainId] = stakingContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(stakingDeploys, null, '\t')}`
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
