const hre = require('hardhat')

async function main() {
  await hre.run('compile')

  const swapToToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // placeholder token
  const uniRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // placeholder address
  const triggerFee = 1
  const payees = ['0x7296333e1615721f4Bd9Df1a3070537484A50CF8'] // placeholder address
  const shares = [10]

  // Deploy the contract
  const Converter = await hre.ethers.getContractFactory('Converter')
  const converter = await Converter.deploy(
    swapToToken,
    uniRouter,
    triggerFee,
    payees,
    shares
  )

  await converter.deployed()
}

/* eslint-disable */
main()
  .then(() => process.exit(0))
  .catch(error => {
    process.exit(1)
  })
