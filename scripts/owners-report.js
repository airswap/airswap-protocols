require('dotenv').config({ path: './.env' })
const { ethers } = require('ethers')
const {
  ADDRESS_ZERO,
  mainnets,
  chainNames,
  ownerAddresses,
  apiUrls,
} = require('@airswap/utils')

const contracts = [
  ['delegate', 'Delegate'],
  ['pool', 'Pool'],
  ['staking', 'Staking'],
  ['swap', 'Swap'],
  ['swap-erc20', 'SwapERC20'],
  ['wrapper', 'Wrapper'],
]

async function main() {
  console.log()
  for (let m = 0; m < mainnets.length; m++) {
    const chainId = mainnets[m]
    let apiUrl = apiUrls[chainId]
    if (apiUrl.indexOf('infura.io') !== -1)
      apiUrl += `/${process.env.INFURA_API_KEY}`
    const provider = new ethers.providers.JsonRpcProvider(apiUrl)
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

    const owners = await Promise.allSettled(
      await contracts.map(async (name) => {
        const deploys = require(`../source/${name[0]}/deploys.js`)
        const factory =
          require(`../source/${name[0]}/typechain/factories/contracts`)[
            `${name[1]}__factory`
          ]
        if (deploys[chainId]) {
          const contract = factory.connect(deploys[chainId], deployer)
          const currentOwner = await contract.owner()
          let pendingOwner = null
          if (typeof contract.pendingOwner === 'function') {
            pendingOwner = await contract.pendingOwner()
          }
          return [
            name[0],
            name[1],
            currentOwner,
            pendingOwner !== ADDRESS_ZERO ? pendingOwner : null,
          ]
        }
        return [name[0], name[1]]
      })
    )

    const intendedOwner = ownerAddresses[chainId]
    console.log(
      chainNames[chainId].toUpperCase(),
      '· Intended owner: ',
      intendedOwner,
      '\n'
    )
    owners.map((owner) => {
      if (owner.reason) {
        console.log(owner.reason)
      } else if (owner.value[2]) {
        let label = '· Correct owner'
        if (owner.value[2] !== intendedOwner) {
          label = `· Incorrect owner: ${owner.value[2]}`
        }
        if (owner.value[3]) {
          label += ` · Pending acceptance by: ${owner.value[3]}`
        }
        console.log(
          owner.value[2] === intendedOwner ? '✔' : '✘',
          owner.value[1],
          label
        )
      }
    })
    console.log()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
