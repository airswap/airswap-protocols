const { ethers } = require('hardhat')
const { getKnownTokens } = require('@airswap/metadata')
const { chainNames, ChainIds } = require('@airswap/constants')
const BatchCall = require('@airswap/batch-call/build/contracts/BatchCall.sol/BatchCall.json')
const batchCallDeploys = require('@airswap/batch-call/deploys.js')
const poolDeploys = require('../deploys.js')

async function main() {
  const [account] = await ethers.getSigners()
  const chainId = await account.getChainId()
  if (chainId === ChainIds.HARDHAT) {
    console.log('Value for --network flag is required')
    return
  }
  console.log('Account:', account.address)
  console.log('Network:', chainNames[chainId].toUpperCase())
  console.log('\nPool:', poolDeploys[chainId])

  if (!batchCallDeploys[chainId]) {
    throw new Error('Unable to check balances on this chain.')
  }

  const tokens = (await getKnownTokens(Number(chainId))).tokens

  let count = tokens.length
  const addresses = []
  while (count--) {
    if (ethers.utils.isAddress(tokens[count].address)) {
      addresses.push(tokens[count].address.toLowerCase())
    }
  }

  console.log(`\nScanning non-zero balances for ${tokens.length} tokens...\n`)

  const balancesContract = new ethers.Contract(
    batchCallDeploys[chainId],
    BatchCall.abi,
    account.provider
  )

  const chunk = 750
  let balances = []
  let index = 0
  count = addresses.length
  while (index < count) {
    balances = balances.concat(
      await balancesContract.walletBalances(
        poolDeploys[chainId],
        addresses.slice(index, index + chunk)
      )
    )
    index += chunk
  }

  const result = []
  for (let i = 0; i < balances.length; i++) {
    if (!balances[i].eq(0)) {
      result.push(addresses[i])
    }
  }

  console.log('Non-zero balances in', result.length, 'tokens:\n')
  console.log(JSON.stringify(result))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
