/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const name = 'Staked AST'
  const symbol = 'sAST'
  const stakingToken = stakingTokenAddresses[chainId]
  const stakingDuration = 60 * 60 * 24 * 7 * 20 // Twenty Weeks
  const minDurationChangeDelay = 60 * 60 * 24 * 7 // One Week

  console.log(`Contract: ${stakingDeploys[chainId]}`)
  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)
  await run('verify:verify', {
    address: stakingDeploys[chainId],
    constructorArguments: [
      name,
      symbol,
      stakingToken,
      stakingDuration,
      minDurationChangeDelay,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
