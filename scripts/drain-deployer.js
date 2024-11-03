require('dotenv').config({ path: './.env' })
const Confirm = require('prompt-confirm')
const { ethers } = require('ethers')
const {
  ChainIds,
  chainNames,
  chainCurrencies,
  apiUrls,
  getReceiptUrl,
  ADDRESS_ZERO,
  EVM_NATIVE_TOKEN_DECIMALS,
} = require('@airswap/utils')

const CONFIRMATIONS = 2
const RECIPIENT = '0x0000000000000000000000000000000000000000'

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
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const gasPrice = await deployer.getGasPrice()

  const balance = await deployer.getBalance()
  const balanceFormatted = ethers.utils.formatUnits(
    balance.toString(),
    EVM_NATIVE_TOKEN_DECIMALS
  )

  if (balance.isZero()) {
    console.log(
      `\n✘ Balance is already 0 on ${process.argv[3].toUpperCase()}.\n`
    )
    process.exit(0)
  }

  if (RECIPIENT === ADDRESS_ZERO) {
    console.log('\n✘ RECIPIENT must be set.\n')
    process.exit(0)
  }

  const estimation = await provider.estimateGas({
    to: RECIPIENT,
    value: 1,
  })

  const cost = estimation.mul(gasPrice)
  const costFormatted = ethers.utils.formatUnits(
    cost,
    EVM_NATIVE_TOKEN_DECIMALS
  )
  const value = balance.sub(cost)

  console.log(`\nNetwork: ${chainNames[chainId].toUpperCase()}`)
  console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)
  console.log(`\nDeployer: ${deployer.address}`)
  console.log(`Balance: ${balanceFormatted} ${chainCurrencies[chainId]}`)
  console.log(`Transfer cost: ${costFormatted} ${chainCurrencies[chainId]}`)
  console.log(
    `Net amount: ${ethers.utils.formatUnits(
      value,
      EVM_NATIVE_TOKEN_DECIMALS
    )} ${chainCurrencies[chainId]}\n`
  )

  if (value.isNegative()) {
    console.log('✘ Not enough balance to perform transfer.\n')
    process.exit(0)
  }

  const prompt = new Confirm(`Transfer ${balanceFormatted} to ${RECIPIENT}?`)
  if (await prompt.run()) {
    const tx = await deployer.sendTransaction({
      to: RECIPIENT,
      value,
      gasPrice,
    })
    console.log('Transferring...', getReceiptUrl(chainId, tx.hash), '\n')
    await tx.wait(CONFIRMATIONS)
    console.log('✔ Balance transfer complete.\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
