require('dotenv').config({ path: '../../.env' })
module.exports = {
  typechain: {
    outDir: 'typechain',
  },
  ...require('../../hardhat.config.js'),
}
