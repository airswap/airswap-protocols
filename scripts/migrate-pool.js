require('dotenv').config({ path: './.env' })
const Confirm = require('prompt-confirm')
const { ethers } = require('hardhat')
const {
  ChainIds,
  chainNames,
  apiUrls,
  getReceiptUrl,
} = require('@airswap/utils')

const { Pool__factory } = require('@airswap/pool/typechain/factories/contracts')
const { abi } = require('@airswap/pool/legacy-abis/4-1-1.js')
const deploys = require('@airswap/pool/deploys.js')

const CONFIRMATIONS = 2
const PREVIOUS_POOL = '0xEEcD248D977Fd4D392915b4AdeF8154BA3aE9c02'
const NEW_POOL = '0xbbcec987E4C189FCbAB0a2534c77b3ba89229F11'

async function main() {
  let chainId
  if (process.argv[2] === '--network') {
    chainId = ChainIds[process.argv[3].toUpperCase()]
  }

  if (!chainId) {
    console.log('Value for --network flag is required')
    return
  }

  const provider = new ethers.providers.JsonRpcProvider(apiUrls[chainId])
  const account = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

  console.log(`Account: ${account.address}`)
  console.log(`Network: ${chainNames[chainId].toUpperCase()}\n`)
  console.log(`From-pool: ${PREVIOUS_POOL}`)
  console.log(`To-pool: ${NEW_POOL}`)

  const previousPool = new ethers.Contract(PREVIOUS_POOL, abi, account.provider)
  let logs
  try {
    logs = await previousPool.queryFilter(previousPool.filters.UseClaim())
  } catch (error) {
    console.log('\n✘ Error querying claim events on from-pool.\n\n', error.body)
    return
  }

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

    const prompt = new Confirm('Enable and set above as claimed on to-pool?')
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
