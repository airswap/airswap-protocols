/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const { ChainIds, chainNames } = require('@airswap/constants')
const adapterDeploys = require('../deploys-adapters.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)

  for (let i = 0; i < adapterDeploys[chainId].length; i++) {
    try {
      await run('verify:verify', {
        address: adapterDeploys[chainId][i],
        constructorArguments: [],
      })
    } catch (e) {
      console.log(e)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
