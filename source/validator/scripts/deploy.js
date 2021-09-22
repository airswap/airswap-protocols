/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const lightDeploys = require('@airswap/light/deploys.js')
const { chainNames } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const lightAddress = lightDeploys[chainId]

  // Deploy Validator
  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const validatorFactory = await ethers.getContractFactory('Validator')
  const validator = await validatorFactory.deploy(lightAddress)
  await validator.deployed()
  console.log(`New Validator: ${validator.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await run('verify:verify', {
    address: validator.address,
    constructorArguments: [lightAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
