const utils = require('web3-utils')

module.exports = {
  Locators: {
    CONTRACT: '01',
    INSTANT: '02',
    URL: '03',
  },
  serialize(kind, location) {
    let result
    if (kind === this.Locators.URL) {
      if (location.length > 31) {
        throw new Error(
          `Location must not exceed 31 characters in length: ${location}`
        )
      }
      return `${utils.utf8ToHex(location).padEnd(64, '0') + kind}`
    }
    if (!utils.isAddress(location)) {
      throw new Error(`Location must be a valid Ethereum address: ${location}`)
    }
    return `${location.padEnd(64, '0') + kind}`
  },
  deserialize(locator) {
    let result

    const kind = `0x${locator.slice(2, 4)}`
    const location = utils.hexToUtf8(`0x${locator.slice(4)}`)

    return {
      kind,
      location,
    }
  },
}
