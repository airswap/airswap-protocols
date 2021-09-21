/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const converterDeploys = require('@airswap/converter/deploys.js')
const { chainNames } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const feeWallet = converterDeploys[chainId]
  const signerFee = 30

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const lightFactory = await ethers.getContractFactory('Light')
  const lightContract = await lightFactory.deploy(feeWallet, signerFee)
  await lightContract.deployed()
  console.log(`New Light: ${lightContract.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await run('verify:verify', {
    address: lightContract.address,
    constructorArguments: [feeWallet, signerFee],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
