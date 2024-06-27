/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const registryDeploys = require('../deploys.js')
const { chainNames, ChainIds } = require('@airswap/utils')
const config = require('./config.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  let stakingToken
  let stakingCost
  let supportCost

  if (config[chainId]) {
    ;({ stakingToken, stakingCost, supportCost } = config[chainId])
  } else {
    ;({ stakingToken, stakingCost, supportCost } = config[ChainIds.MAINNET])
  }

  console.log(`\nstakingToken: ${stakingToken}`)
  console.log(`stakingCost: ${stakingCost}`)
  console.log(`supportCost: ${supportCost}\n`)

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: registryDeploys[chainId],
    constructorArguments: [stakingToken, stakingCost, supportCost],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
