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

const { defaults, NULL_ADDRESS } = require('./constants')

const signatures = require('./signatures')

module.exports = {
  _knownAccounts: [],
  _verifyingContract: NULL_ADDRESS,
  setKnownAccounts(knownAccounts) {
    this._knownAccounts = knownAccounts
  },
  setVerifyingContract(verifyingContract) {
    this._verifyingContract = verifyingContract
  },
  generateNonce() {
    return new Date().getTime()
  },
  generateExpiry() {
    return Math.round((new Date().getTime() + 60000) / 1000)
  },
  async getOrder({
    expiry = this.generateExpiry(),
    nonce = this.generateNonce(),
    signer = NULL_ADDRESS,
    maker = defaults.Party,
    taker = defaults.Party,
    affiliate = defaults.Party,
  }) {
    const order = {
      expiry,
      nonce,
      maker: { ...defaults.Party, ...maker },
      taker: { ...defaults.Party, ...taker },
      affiliate: { ...defaults.Party, ...affiliate },
    }
    const wallet = signer !== NULL_ADDRESS ? signer : order.maker.wallet
    if (this._knownAccounts.indexOf(wallet) !== -1) {
      return {
        order,
        signature: await signatures.getWeb3Signature(
          order,
          wallet,
          this._verifyingContract
        ),
      }
    }
    return { order }
  },
}
