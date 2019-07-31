/*
  Copyright 2019 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const utils = require('web3-utils')

module.exports = {
  Locators: {
    CONTRACT: '01',
    INSTANT: '02',
    URL: '03',
  },
  serialize(kind, location) {
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
    const kind = `0x${locator.slice(2, 4)}`
    const location = utils.hexToUtf8(`0x${locator.slice(4)}`)

    return {
      kind,
      location,
    }
  },
}
