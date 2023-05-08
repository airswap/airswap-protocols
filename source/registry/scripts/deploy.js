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
  const chainId = await deployer.getChainId()
  const gasPrice = await deployer.getGasPrice()
  const stakingToken = stakingTokenAddresses[chainId]
  const obligationCost = 1000000000
  const tokenCost = 1000000

  console.log(`\nstakingToken: ${stakingToken}`)
  console.log(`obligationCost: ${obligationCost}`)
  console.log(`tokenCost: ${tokenCost}\n`)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)

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
