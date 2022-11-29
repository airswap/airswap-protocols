/* eslint-disable no-console */
const fs = require('fs')
const { ethers, run } = require('hardhat')
const swapDeploys = require('@airswap/swap-erc20/deploys.js')
const wrapperDeploys = require('../deploys.js')
const { chainNames, wrappedTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const swapAddress = swapDeploys[chainId]
  const wrappedTokenAddress = wrappedTokenAddresses[chainId]

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Swap: ${swapAddress}`)
  console.log(`Wrapped: ${wrappedTokenAddress}`)

  const wrapperFactory = await ethers.getContractFactory('Wrapper')
  const wrapperContract = await wrapperFactory.deploy(
    swapAddress,
    wrappedTokenAddress
  )
  await wrapperContract.deployed()
  console.log(`Deployed: ${wrapperContract.address}`)

  wrapperDeploys[chainId] = wrapperContract.address
  fs.writeFileSync(
    './deploys.js',
    `module.exports = ${JSON.stringify(wrapperDeploys, null, '\t')}`
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
