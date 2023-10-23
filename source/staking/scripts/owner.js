const { check } = require('../../../scripts/owners-update')
const {
  Staking__factory,
} = require('@airswap/staking/typechain/factories/contracts')
const deploys = require('../deploys.js')

async function main() {
  await check('Staking', Staking__factory, deploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
