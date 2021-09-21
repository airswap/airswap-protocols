/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const lightDeploys = require('@airswap/light/deploys.js')
const { chainNames, wethAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const lightAddress = lightDeploys[chainId]
  const wethAddress = wethAddresses[chainId]

  // Wrapper Deploy
  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const wrapperFactory = await ethers.getContractFactory('Wrapper')
  const wrapperContract = await wrapperFactory.deploy(lightAddress, wethAddress)
  await wrapperContract.deployed()
  console.log(`New Wrapper: ${wrapperContract.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await run('verify:verify', {
    address: wrapperContract.address,
    constructorArguments: [lightAddress, wethAddress],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
