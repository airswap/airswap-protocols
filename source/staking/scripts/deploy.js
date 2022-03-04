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
  const vestingLength = 100
  const minimumDelay = 86400 // 3 days

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  const stakingFactory = await ethers.getContractFactory('Staking')
  const stakingContract = await stakingFactory.deploy(
    stakingToken,
    name,
    symbol,
    vestingLength,
    minimumDelay
  )
  await stakingContract.deployed()
  console.log(`Deployed: ${stakingContract.address}`)
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
