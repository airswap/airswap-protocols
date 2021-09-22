/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const stakingToken = stakingTokenAddresses[chainId]
  const name = 'Staked AST'
  const symbol = 'sAST'
  const duration = 300
  const cliff = 30

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const stakingFactory = await ethers.getContractFactory('Staking')
  const stakingContract = await stakingFactory.deploy(
    stakingToken,
    name,
    symbol,
    duration,
    cliff
  )
  await stakingContract.deployed()
  console.log(`New Staking: ${stakingContract.address}`)

  await run('verify:verify', {
    address: stakingContract.address,
    constructorArguments: [stakingToken, name, symbol, duration, cliff],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
