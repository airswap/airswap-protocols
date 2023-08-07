/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const registryDeploys = require('../deploys.js')
const { chainNames, ADDRESS_ZERO } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const stakingToken = ADDRESS_ZERO // stakingTokenAddresses[chainId]
  const stakingCost = 0 // 1000000000
  const supportCost = 0 // 1000000

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
