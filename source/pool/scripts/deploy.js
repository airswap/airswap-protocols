/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const scale = 10
  const max = 100
  const stakingContract = stakingDeploys[chainId]
  const stakingToken = stakingTokenAddresses[chainId]

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const poolFactory = await ethers.getContractFactory('Pool')
  const poolContract = await poolFactory.deploy(
    scale,
    max,
    stakingContract,
    stakingToken
  )
  await poolContract.deployed()
  console.log(`New Registry: ${poolContract.address}`)

  console.log('Waiting to verify...')
  await new Promise((r) => setTimeout(r, 60000))

  console.log('Verifying...')
  await run('verify:verify', {
    address: poolContract.address,
    constructorArguments: [scale, max, stakingContract, stakingToken],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
