const { check } = require('../../../scripts/owners-update')
const { Pool__factory } = require('@airswap/pool/typechain/factories/contracts')
const poolDeploys = require('../deploys.js')

async function main() {
  await check('Pool', Pool__factory, poolDeploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
