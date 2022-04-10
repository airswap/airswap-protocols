/* eslint-disable no-console */
const fs = require('fs')
const { ethers, run } = require('hardhat')
const {
  chainNames,
  wrappedTokenAddresses,
  uniswapRouterAddress,
} = require('@airswap/constants')
const poolDeploys = require('@airswap/pool/deploys.js')
const converterDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const wrappedTokenAddress = wrappedTokenAddresses[chainId]
  const poolAddress = poolDeploys[chainId]

  const payees = [poolAddress]
  const shares = [100]
  const triggerFee = 0

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const converterFactory = await ethers.getContractFactory('Converter')
  const converter = await converterFactory.deploy(
    wrappedTokenAddress,
    wrappedTokenAddress,
    uniswapRouterAddress,
    triggerFee,
    payees,
    shares
  )
  await converter.deployed()
  console.log(`Deployed: ${converter.address}`)

  converterDeploys[chainId] = converter.address
  fs.writeFileSync(
    './deploys.js',
    `module.exports = ${JSON.stringify(converterDeploys, null, '\t')}`
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
    console.log(error)
    process.exit(1)
  })
