const { check } = require('../../../scripts/owners-update')
const { Delegate__factory } = require('../typechain/factories/contracts')
const delegateDeploys = require('../deploys.js')

async function main() {
  await check('Delegate', Delegate__factory, delegateDeploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
