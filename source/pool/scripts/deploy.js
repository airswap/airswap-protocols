/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const { chainNames } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const scale = 10
  const max = 100
  const stakingContract = 0x579120871266ccd8de6c85ef59e2ff6743e7cd15
  const stakingToken = 0x27054b13b1b798b345b591a4d22e6562d47ea75a

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const poolFactory = await ethers.getContractFactory('Pool')
  const poolContract = await poolFactory.deploy(scale, max, stakingContract, stakingToken)
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
