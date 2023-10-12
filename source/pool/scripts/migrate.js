const Confirm = require('prompt-confirm')
const { ethers } = require('hardhat')
const { chainNames, ChainIds, apiUrls } = require('@airswap/constants')

const { abi } = require('./migrate-abis/4-1-1.js')
const PREVIOUS_POOL = '0xEEcD248D977Fd4D392915b4AdeF8154BA3aE9c02'
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
  console.log(`From Pool: ${PREVIOUS_POOL}`)
  console.log(`To Pool: ${NEW_POOL}`)

  let apiUrl = apiUrls[chainId]
  if (apiUrl.indexOf('infura.io') !== -1)
    apiUrl += '/' + process.env.INFURA_API_KEY

  const provider = new ethers.providers.JsonRpcProvider(apiUrl)
  const contract = new ethers.Contract(PREVIOUS_POOL, abi, provider)
  const logs = await contract.queryFilter(contract.filters.UseClaim())

  const trees = {}
  let i = logs.length
  while (--i) {
    const e = logs[i].decode(logs[i].data)
    if (!trees[e.tree]) {
      trees[e.tree] = [e.account]
    } else {
      trees[e.tree].push(e.account)
    }
  }
  console.log('\nPrevious Claims', trees)

  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const gasPrice = await account.getGasPrice()

  console.log(`\nGas price: ${gasPrice / 10 ** 9} gwei\n`)

  for (const tree in trees) {
    const prompt = new Confirm(`Enable and migrate ${tree}?`)
    if (await prompt.run()) {
      console.log('Going...')
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
