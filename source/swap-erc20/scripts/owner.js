const { check } = require('../../../scripts/owners-update')
const {
  SwapERC20__factory,
} = require('@airswap/swap-erc20/typechain/factories/contracts')
const deploys = require('../deploys.js')

async function main() {
  await check('SwapERC20', SwapERC20__factory, deploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
