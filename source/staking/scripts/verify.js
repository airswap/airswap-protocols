/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const stakingToken = stakingTokenAddresses[chainId]
  const name = 'Staked AST'
  const symbol = 'sAST'
  const duration = 12096000
  const minDelay = 2419200

  console.log(`Contract: ${stakingDeploys[chainId]}`)
  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: stakingDeploys[chainId],
    constructorArguments: [stakingToken, name, symbol, duration, minDelay],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
