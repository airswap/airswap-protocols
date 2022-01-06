/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const stakingToken = stakingTokenAddresses[chainId]
  const obligationCost = 1000000000
  const tokenCost = 1000000

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const registryFactory = await ethers.getContractFactory('Registry')
  const registryContract = await registryFactory.deploy(
    stakingToken,
    obligationCost,
    tokenCost
  )
  await registryContract.deployed()
  console.log(`New Registry: ${registryContract.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await run('verify:verify', {
    address: registryContract.address,
    constructorArguments: [stakingToken, obligationCost, tokenCost],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
