/* eslint-disable no-console */
const Confirm = require('prompt-confirm')
const { ethers } = require('hardhat')
const { Pool__factory } = require('@airswap/pool/typechain/factories/contracts')
const { chainNames, ChainIds, ownerAddresses } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')
const poolDeploys = require('../deploys.js')

async function main() {
  const [deployer] = await ethers.getSigners()
  const gasPrice = await deployer.getGasPrice()
  const chainId = await deployer.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Network: ${chainNames[chainId].toUpperCase()}\n`)

  if (!poolDeploys[chainId]) {
    console.log(`✘ No deploy found for selected network.\n`)
    process.exit(0)
  }

  const contract = Pool__factory.connect(poolDeploys[chainId], deployer)
  const currentOwner = await contract.owner()

  console.log(`Current owner: ${currentOwner}`)
  console.log(`Intended owner: ${ownerAddresses[chainId] || 'Not set'}`)

  if (currentOwner === ownerAddresses[chainId]) {
    console.log(`\n✔ Owner matches intended owner.\n`)
  } else if (!ownerAddresses[chainId]) {
    console.log(`\n✘ Intended owner must be set.\n`)
  } else if (deployer.address !== currentOwner) {
    console.log(`\n✘ Deployer does not match current owner.\n`)
  } else {
    console.log(`\n✘ Current owner does not match intended owner.\n`)
    console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)
    const prompt = new Confirm(`Update owner to intended?`)
    if (await prompt.run()) {
      const tx = contract.transferOwnership(ownerAddresses[chainId])
      console.log('Updating...', getReceiptUrl(chainId, tx.hash))
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
