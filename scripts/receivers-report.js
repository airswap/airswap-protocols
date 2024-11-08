require('dotenv').config({ path: './.env' })
const { ethers } = require('ethers')
const {
  mainnets,
  chainNames,
  apiUrls,
  protocolFeeReceiverAddresses,
  ADDRESS_ZERO,
} = require('@airswap/utils')
const poolDeploys = require('@airswap/pool/deploys.js')

const contracts = [
  ['swap', 'Swap'],
  ['swap-erc20', 'SwapERC20'],
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

    const receivers = await Promise.allSettled(
      await contracts.map(async (name) => {
        const deploys = require(`../source/${name[0]}/deploys.js`)
        const factory =
          require(`../source/${name[0]}/typechain/factories/contracts`)[
            `${name[1]}__factory`
          ]
        if (deploys[chainId]) {
          const contract = factory.connect(deploys[chainId], deployer)
          const currentReceiver = await contract.protocolFeeWallet()
          return [name[0], name[1], currentReceiver]
        }
        return [name[0], name[1]]
      })
    )

    let intendedReceiver = poolDeploys[chainId] || ADDRESS_ZERO
    if (protocolFeeReceiverAddresses[chainId]) {
      intendedReceiver = protocolFeeReceiverAddresses[chainId]
    }

    console.log(
      chainNames[chainId].toUpperCase(),
      '· Intended receiver: ',
      intendedReceiver,
      '\n'
    )
    receivers.map((receiver) => {
      if (receiver.reason) {
        console.log(receiver.reason)
      } else if (receiver.value[2]) {
        let label = '· Correct receiver'
        if (receiver.value[2] !== intendedReceiver) {
          label = `· Incorrect receiver: ${receiver.value[2]}`
        }
        console.log(
          receiver.value[2] === intendedReceiver ? '✔' : '✘',
          receiver.value[1],
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
