/* eslint-disable no-console */
const fs = require('fs')
const Confirm = require('prompt-confirm')
const { ethers, run } = require('hardhat')
const poolDeploys = require('@airswap/pool/deploys.js')
const { chainNames, ChainIds, TokenKinds } = require('@airswap/constants')
const { getEtherscanURL } = require('@airswap/utils')
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

  console.log(`\nNetwork: ${chainNames[chainId].toUpperCase()}`)
  console.log(`Deployer: ${deployer.address}\n`)

  const protocolFeeWallet = poolDeploys[chainId]
  const protocolFee = 7
  const adapters = ['ERC20Adapter', 'ERC721Adapter', 'ERC1155Adapter']

  console.log(`adapters: ${JSON.stringify(adapters)}`)
  console.log(`protocolFee: ${protocolFee}`)
  console.log(`protocolFeeWallet: ${protocolFeeWallet}`)

  console.log(`\nGas price: ${gasPrice / 10 ** 9} gwei`)

  const prompt = new Confirm('Proceed to deploy?')
  if (await prompt.run()) {
    for (let i = 0; i < adapters.length; i++) {
      const adapterContract = await (
        await ethers.getContractFactory(adapters[i])
      ).deploy()
      console.log(
        `Deploying ${adapters[i]}...`,
        getEtherscanURL(chainId, adapterContract.deployTransaction.hash)
      )
      await adapterContract.deployed()
      adapters[i] = adapterContract.address
    }
    const swapFactory = await ethers.getContractFactory('Swap')
    const swapContract = await swapFactory.deploy(
      adapters,
      TokenKinds.ERC20,
      protocolFee,
      protocolFeeWallet
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

    adapterDeploys[chainId] = adapters
    fs.writeFileSync(
      './deploys-adapters.js',
      `module.exports = ${JSON.stringify(adapterDeploys, null, '\t')}`
    )
    console.log('Updated deploys-adapters.js')
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
