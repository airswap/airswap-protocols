/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const stakingDeploys = require('@airswap/staking/deploys.js')
const { chainNames } = require('@airswap/constants')
const { getEtherscanURL } = require('@airswap/constants')
const swapDeploys = require('../deploys.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const gasPrice = await deployer.getGasPrice()
  const protocolFeeWallet = poolDeploys[chainId]
  const stakingContract = stakingDeploys[chainId]
  const protocolFee = 7
  const protocolFeeLight = 7
  const rebateScale = 10
  const rebateMax = 100

  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Fee recipient: ${protocolFeeWallet}`)
  console.log(`Staking contract: ${stakingContract}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const swapFactory = await ethers.getContractFactory('SwapERC20')
    const swapContract = await swapFactory.deploy(
      protocolFee,
      protocolFeeLight,
      protocolFeeWallet,
      rebateScale,
      rebateMax,
      stakingContract
    )
    console.log(
      'Deploying...',
      getEtherscanURL(chainId, swapContract.deployTransaction.hash)
    )
    await swapContract.deployed()
    console.log(`Deployed: ${swapContract.address}`)

    swapDeploys[chainId] = swapContract.address
    fs.writeFileSync(
      './deploys.js',
      `module.exports = ${JSON.stringify(swapDeploys, null, '\t')}`
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
