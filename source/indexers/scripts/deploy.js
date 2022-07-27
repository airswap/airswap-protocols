/* eslint-disable no-console */
const fs = require('fs')
const { ethers, run } = require('hardhat')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')
const registryDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const stakingToken = stakingTokenAddresses[chainId]
  const obligationCost = 0

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const registryFactory = await ethers.getContractFactory('Indexers')
  const registryContract = await registryFactory.deploy(
    stakingToken,
    obligationCost
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
