/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const registryDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const gasPrice = await deployer.getGasPrice()
  const stakingToken = stakingTokenAddresses[chainId]
  const obligationCost = 0
  const tokenCost = 0

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Staking token: ${stakingToken}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const registryFactory = await ethers.getContractFactory('Registry')
    const registryContract = await registryFactory.deploy(
      stakingToken,
      obligationCost,
      tokenCost
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, registryContract.deployTransaction.hash)
    )
    await registryContract.deployed()
    console.log(`Deployed: ${registryContract.address}`)

    registryDeploys[chainId] = registryContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(registryDeploys, null, '\t')}`
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
