/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const {
  chainNames,
  wethAddresses,
  uniswapRouterAddress,
} = require('@airswap/constants')
const poolDeploys = require('@airswap/pool/deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const wethAddress = wethAddresses[chainId]
  const poolAddress = poolDeploys[chainId]

  const payees = [poolAddress]
  const shares = [100]
  const triggerFee = 0

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const converterFactory = await ethers.getContractFactory('Converter')
  const converter = await converterFactory.deploy(
    wethAddress,
    wethAddress,
    uniswapRouterAddress,
    triggerFee,
    payees,
    shares
  )
  await converter.deployed()
  console.log(`Deployed: ${converter.address}`)
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
