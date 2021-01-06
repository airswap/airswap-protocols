const ethUtil = require('ethereumjs-util')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

// We assume deterministic ganache mnemonic is being used
const GANACHE_MNEMONIC =
  'myth like bonus scare over problem client lizard pioneer submit female collect'

const HD_PATH = "m/44'/60'/0'/0/"

const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(GANACHE_MNEMONIC))

function getPrivateKeyFromGanacheAccount(account) {
  for (let i = 0; i < 100; i++) {
    const node = hdwallet.derivePath(HD_PATH + String(i))
    const key = node.getWallet().getPrivateKey()
    if (
      ethUtil.bufferToHex(ethUtil.privateToAddress(key)).toLowerCase() ===
      account.toLowerCase()
    ) {
      return ethUtil.bufferToHex(key)
    }
  }
  throw new Error('No private key found for address')
}

module.exports = {
  getPrivateKeyFromGanacheAccount,
}
