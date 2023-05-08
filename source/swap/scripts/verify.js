/* eslint-disable no-console */
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const { chainNames, TokenKinds } = require('@airswap/constants')
const swapDeploys = require('../deploys.js')
const adapterDeploys = require('../deploys-adapters.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const chainId = await deployer.getChainId()
  const requiredSenderKind = TokenKinds.ERC20
  const protocolFee = 7
  const protocolFeeWallet = poolDeploys[chainId]

  console.log(`Verifying on ${chainNames[chainId].toUpperCase()}`)

  await run('verify:verify', {
    address: swapDeploys[chainId],
    constructorArguments: [
      adapterDeploys[chainId],
      requiredSenderKind,
      protocolFee,
      protocolFeeWallet,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
