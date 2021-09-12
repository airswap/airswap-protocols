/* eslint-disable no-console */
const hre = require('hardhat')

async function main() {
  await hre.run('compile')

  const wETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // placeholder token
  const swapToToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // placeholder token
  const uniRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // placeholder address
  const triggerFee = 1
  const payees = ['0x7296333e1615721f4Bd9Df1a3070537484A50CF8'] // placeholder address
  const shares = [10]

  // Deploy the contract
  const Converter = await hre.ethers.getContractFactory('Converter')
  const converter = await Converter.deploy(
    wETH,
    swapToToken,
    uniRouter,
    triggerFee,
    payees,
    shares
  )

  await converter.deployed()
  console.log(`Converter Address: ${converter.address}`)

  console.log('Waiting to verify...')
  await new Promise(r => setTimeout(r, 60000))

  console.log('Verifying...')
  await hre.run('verify:verify', {
    address: converter.address,
    constructorArguments: [
      wETH,
      swapToToken,
      uniRouter,
      triggerFee,
      payees,
      shares,
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.log(error)
    process.exit(1)
  })
