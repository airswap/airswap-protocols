const Confirm = require('prompt-confirm')
const { ethers } = require('hardhat')
const {
  chainNames,
  ChainIds,
  ownerAddresses,
  getReceiptUrl,
} = require('@airswap/utils')

const CONFIRMATIONS = 2
const TRANSFER_STARTED =
  '0x38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e22700'

module.exports = {
  check: async (name, factory, deploys) => {
    const [account] = await ethers.getSigners()
    const gasPrice = await account.getGasPrice()
    const chainId = await account.getChainId()
    if (chainId === ChainIds.HARDHAT) {
      console.log('Value for --network flag is required')
      return
    }
    console.log(`Account: ${account.address}`)
    console.log(`Network: ${chainNames[chainId].toUpperCase()}\n`)

    if (!deploys[chainId]) {
      console.log('✘ No deploy found for selected network.\n')
      process.exit(0)
    }

    const contract = factory.connect(deploys[chainId], account)
    const currentOwner = await contract.owner()

    console.log(`${name} @ ${contract.address}\n`)
    console.log(`Current owner: ${currentOwner}`)
    console.log(`Intended owner: ${ownerAddresses[chainId] || 'Not set'}`)

    if (currentOwner === ownerAddresses[chainId]) {
      console.log('\n✔ Owner matches intended owner.\n')
    } else if (!ownerAddresses[chainId]) {
      console.log('\n✘ Intended owner must be set.\n')
    } else if (account.address !== currentOwner) {
      console.log('\n✘ Current owner does not match intended owner.')
      console.log(
        '✘ Cannot update because current account does not match current owner.\n'
      )
    } else {
      console.log('\n✘ Current owner does not match intended owner.\n')
      console.log(`Gas price: ${gasPrice / 10 ** 9} gwei\n`)
      const prompt = new Confirm('Transfer ownership to intended owner?')
      if (await prompt.run()) {
        const tx = await contract.transferOwnership(ownerAddresses[chainId])
        console.log('Updating...', getReceiptUrl(chainId, tx.hash), '\n')
        const receipt = await tx.wait(CONFIRMATIONS)
        if (receipt.logs[0].topics[0] === TRANSFER_STARTED) {
          console.log(
            '✔ Ownership transfer started but must be accepted by new owner.\n'
          )
        } else {
          console.log('✔ Ownership transfer complete.\n')
        }
      }
    }
  },
}
