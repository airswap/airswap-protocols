/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const stakingDeploys = require('../deploys.js')
const { chainNames } = require('@airswap/constants')
const config = require('./config.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const {
    name,
    symbol,
    stakingToken,
    stakingDuration,
    minDurationChangeDelay,
  } = config[chainId]

  console.log(`Contract: ${stakingDeploys[chainId]}`)
  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: stakingDeploys[chainId],
    constructorArguments: [
      name,
      symbol,
      stakingToken,
      stakingDuration,
      minDurationChangeDelay,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
