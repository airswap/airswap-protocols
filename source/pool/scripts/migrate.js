const Confirm = require('prompt-confirm')
const { ethers } = require('hardhat')
const { chainNames, ChainIds } = require('@airswap/constants')
const { getReceiptUrl } = require('@airswap/utils')

const { Pool__factory } = require('../typechain/factories/contracts')
const { abi } = require('./migrate-abis/4-1-1.js')
const deploys = require('../deploys.js')

const CONFIRMATIONS = 2
const PREVIOUS_POOL = '0xa55CDCe4F6300D57831b2792c45E55a899D8e2a4'
const NEW_POOL = '0xEEcD248D977Fd4D392915b4AdeF8154BA3aE9c02'

async function main() {
  const [account] = await ethers.getSigners()
  const chainId = await account.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }
  console.log(`Account: ${account.address}`)
  console.log(`Network: ${chainNames[chainId].toUpperCase()}\n`)
  console.log(`From-pool: ${PREVIOUS_POOL}`)
  console.log(`To-pool: ${NEW_POOL}`)

  const previousPool = new ethers.Contract(PREVIOUS_POOL, abi, account.provider)
  const logs = await previousPool.queryFilter(previousPool.filters.UseClaim())

  if (!logs.length) {
    console.log('\n✘ No claim events found on from-pool.\n')
    return
  }

  const trees = {}
  let i = logs.length
  while (i--) {
    const e = logs[i].decode(logs[i].data)
    if (!trees[e.tree]) {
      trees[e.tree] = [e.account]
    } else {
      trees[e.tree].push(e.account)
    }
  }

  const newPool = Pool__factory.connect(deploys[chainId], account)
  const isAdmin = await newPool.admins(account.address)
  if (!isAdmin) {
    console.log('\n✘ Current account must be admin on to-pool.\n')
    return
  }

  for (const tree in trees) {
    const root = await previousPool.rootsByTree(tree)
    console.log('\nTree:', tree)
    console.log('Root:', root)
    console.log('Claims', trees[tree])

    const gasPrice = await account.getGasPrice()
    console.log(`\nGas price: ${gasPrice / 10 ** 9} gwei\n`)

    const prompt = new Confirm(`Enable and set above as claimed on to-pool?`)
    if (await prompt.run()) {
      const tx = await newPool.enableAndSetClaimed(tree, root, trees[tree])
      console.log('Updating...', getReceiptUrl(chainId, tx.hash), '\n')
      await tx.wait(CONFIRMATIONS)
      console.log(`✔ Completed for tree ${tree}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
