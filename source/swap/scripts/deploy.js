/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const { chainNames, ChainIds, TokenKinds } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const swapDeploys = require('../deploys.js')
const adapterDeploys = require('../deploys-adapters.js')

async function main() {
  await run('compile')
  const [deployer] = await ethers.getSigners()
  const gasPrice = await deployer.getGasPrice()
  const chainId = await deployer.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }

  const requiredSenderKind = TokenKinds.ERC20
  const protocolFee = 7
  const protocolFeeWallet = poolDeploys[chainId]

  console.log(`\nadapters: ${JSON.stringify(adapterDeploys[chainId])}`)
  console.log(`requiredSenderKind: ${requiredSenderKind}`)
  console.log(`protocolFee: ${protocolFee}`)
  console.log(`protocolFeeWallet: ${protocolFeeWallet}\n`)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Deploying on ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    const swapFactory = await ethers.getContractFactory('Swap')
    const swapContract = await swapFactory.deploy(
      adapterDeploys[chainId],
      requiredSenderKind,
      protocolFee,
      protocolFeeWallet
    )
    console.log(
      'Deploying...',
      getReceiptUrl(chainId, swapContract.deployTransaction.hash)
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
