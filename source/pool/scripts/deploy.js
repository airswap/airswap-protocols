/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { chainNames, stakingTokenAddresses } = require('@airswap/constants')
const poolDeploys = require('../deploys.js')

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
  console.log(`Staking token: ${stakingToken}`)
  console.log(`Staking contract: ${stakingContract}`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const poolFactory = await ethers.getContractFactory('Pool')
    const poolContract = await poolFactory.deploy(
      scale,
      max,
      stakingContract,
      stakingToken
    )
    await poolContract.deployed()
    console.log(`Deployed: ${poolContract.address}`)

    poolDeploys[chainId] = poolContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(poolDeploys, null, '\t')}`
    )
    console.log('Updated deploys.js')

    console.log(
      `\nVerify with "yarn verify --network ${chainNames[
        chainId
      ].toLowerCase()}"\n`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
