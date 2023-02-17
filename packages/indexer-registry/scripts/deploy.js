/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const { chainNames } = require('@airswap/constants')
const { getEtherscanURL } = require('@airswap/constants')
const registryDeploys = require('../deploys.js')

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
    const registryFactory = await ethers.getContractFactory('IndexerRegistry')
    const registryContract = await registryFactory.deploy()
    console.log(
      'Deploying...',
      getEtherscanURL(chainId, registryContract.deployTransaction.hash)
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
