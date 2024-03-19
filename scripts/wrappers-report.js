require('dotenv').config({ path: './.env' })
const { ethers } = require('ethers')
const { mainnets, testnets, chainNames, apiUrls } = require('@airswap/utils')
const swapERC20Deploys = require('@airswap/swap-erc20/deploys.js')

const chains = mainnets.concat(testnets)

async function main() {
  console.log()
  for (let c = 0; c < chains.length; c++) {
    const chainId = chains[c]
    const apiUrl = apiUrls[chainId]
    const provider = new ethers.providers.JsonRpcProvider(apiUrl)
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

    const deploys = require('../source/wrapper/deploys.js')
    const {
      Wrapper__factory,
    } = require('@airswap/wrapper/typechain/factories/contracts')
    if (deploys[chainId]) {
      const contract = Wrapper__factory.connect(deploys[chainId], deployer)
      const currentSwapERC20 = await contract.swapERC20Contract()

      const intendedSwapERC20 = swapERC20Deploys[chainId]

      if (intendedSwapERC20) {
        console.log(
          chainNames[chainId].toUpperCase(),
          `(${chainId})`,
          '· Intended SwapERC20: ',
          intendedSwapERC20
        )

        let label = 'Wrapper has correct SwapERC20'
        if (currentSwapERC20 !== intendedSwapERC20) {
          label = `Wrapper has incorrect SwapERC20: ${currentSwapERC20}`
        }
        console.log(currentSwapERC20 === intendedSwapERC20 ? '✔' : '✘', label)
      } else {
        console.log(
          chainNames[chainId].toUpperCase(),
          `(${chainId})`,
          '✘ Not deployed'
        )
      }
      console.log()
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
