const { check } = require('../../../scripts/owners-update')
const {
  BatchCall__factory,
} = require('@airswap/batch-call/typechain/factories/contracts')
const deploys = require('../deploys.js')

async function main() {
  await check('BatchCall', BatchCall__factory, deploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
