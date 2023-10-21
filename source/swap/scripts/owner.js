const { check } = require('../../../scripts/owners-update')
const { Swap__factory } = require('@airswap/swap/typechain/factories/contracts')
const deploys = require('../deploys.js')

async function main() {
  await check('Swap', Swap__factory, deploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
