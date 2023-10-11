const { check } = require('../../../scripts/ownership-update')
const {
  Wrapper__factory,
} = require('@airswap/wrapper/typechain/factories/contracts')
const deploys = require('../deploys.js')

async function main() {
  await check('Wrapper', Wrapper__factory, deploys)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
