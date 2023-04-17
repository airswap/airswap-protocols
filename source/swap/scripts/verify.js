/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const { chainNames, tokenKinds } = require('@airswap/constants')
const swapDeploys = require('../deploys.js')
const adapterDeploys = require('../deploys-adapters.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const protocolFeeWallet = poolDeploys[chainId]
  const protocolFee = 7

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

  await run('verify:verify', {
    address: swapDeploys[chainId],
    constructorArguments: [
      adapterDeploys[chainId],
      tokenKinds.ERC20,
      protocolFee,
      protocolFeeWallet,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
