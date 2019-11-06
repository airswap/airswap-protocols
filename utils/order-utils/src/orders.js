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

const ethers = require('ethers')

const { SECONDS_IN_DAY, defaults, EMPTY_ADDRESS } = require('./constants')

const IERC20 = require('@airswap/tokens/build/contracts/IERC20.json')
const Swap = require('@airswap/swap/build/contracts/Swap.json')

const signatures = require('./signatures')

let nonce = 100

let getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

// network is 'rinkeby' or 'mainnet'
let checkOrder = (order, network) => {
  // check the order has all necessary fields
  if (!isValidOrder(order)) {
    console.log('Order not valid')
  } else {
    // get the network provider
    const provider = ethers.getDefaultProvider(network)

    // check signer balance
    checkBalanceAndApproval(
      order['signer']['token'],
      order['signer']['wallet'],
      order['signer']['param'],
      order['validator'],
      provider
    )

    // check sender balance
    checkBalanceAndApproval(
      order['sender']['token'],
      order['sender']['wallet'],
      order['sender']['param'],
      order['validator'],
      provider
    )

    // check nonce
    checkNonce(
      order['validator'],
      order['signer']['wallet'],
      order['nonce'],
      provider
    )
  }
}

let checkBalanceAndApproval = (
  tokenAddress,
  walletAddress,
  amount,
  approvedAddress,
  provider
) => {
  const tokenContract = new ethers.Contract(tokenAddress, IERC20.abi, provider)

  // check balance
  tokenContract.balanceOf(walletAddress).then(balance => {
    if (balance.toNumber() < amount) {
      console.log('Balance is too low')
    }
  })

  // check approval
  tokenContract.allowance(walletAddress, approvedAddress).then(allowance => {
    if (allowance.toNumber() < amount) {
      console.log('Allowance is too low')
    }
  })
}

let checkNonce = (swapAddress, signer, nonce, provider) => {
  const swapContract = new ethers.Contract(swapAddress, Swap.abi, provider)

  // check not cancelled
  swapContract.signerNonceStatus(signer, nonce).then(status => {
    if (status == '0x01') {
      console.log('Nonce taken or cancelled')
    }
  })

  // check above minimum
  swapContract.signerMinimumNonce(signer).then(minimum => {
    if (minimum > nonce) {
      console.log('Nonce too low')
    }
  })
}

let isValidOrder = order => {
  return (
    'nonce' in order &&
    'expiry' in order &&
    'signer' in order &&
    'sender' in order &&
    'affiliate' in order &&
    'signature' in order &&
    'wallet' in order['signer'] &&
    'wallet' in order['sender'] &&
    'wallet' in order['affiliate'] &&
    'token' in order['signer'] &&
    'token' in order['sender'] &&
    'token' in order['affiliate'] &&
    'param' in order['signer'] &&
    'param' in order['sender'] &&
    'param' in order['affiliate'] &&
    'signatory' in order['signature'] &&
    'validator' in order['signature'] &&
    'r' in order['signature'] &&
    's' in order['signature'] &&
    'v' in order['signature']
  )
}

module.exports = {
  _knownAccounts: [],
  _verifyingContract: EMPTY_ADDRESS,
  setKnownAccounts(knownAccounts) {
    this._knownAccounts = knownAccounts
  },
  setVerifyingContract(verifyingContract) {
    this._verifyingContract = verifyingContract
  },
  generateNonce() {
    nonce = nonce + 1
    return nonce.toString()
  },
  async generateExpiry(days) {
    return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
  },
  async getOrder(
    {
      expiry = '0',
      nonce = this.generateNonce(),
      signatory = EMPTY_ADDRESS,
      signer = defaults.Party,
      sender = defaults.Party,
      affiliate = defaults.Party,
    },
    noSignature
  ) {
    if (expiry === '0') {
      expiry = await this.generateExpiry(1)
    }
    const order = {
      expiry,
      nonce,
      signer: { ...defaults.Party, ...signer },
      sender: { ...defaults.Party, ...sender },
      affiliate: { ...defaults.Party, ...affiliate },
    }

    const wallet = signatory !== EMPTY_ADDRESS ? signatory : order.signer.wallet
    if (!noSignature) {
      if (this._knownAccounts.indexOf(wallet) !== -1) {
        order.signature = await signatures.getWeb3Signature(
          order,
          wallet,
          this._verifyingContract
        )
      } else {
        order.signature = signatures.getEmptySignature()
      }
    }
    return order
  },
  isValidQuote(quote) {
    return (
      'signer' in quote &&
      'sender' in quote &&
      'token' in quote['signer'] &&
      'token' in quote['sender'] &&
      'param' in quote['signer'] &&
      'param' in quote['sender'] &&
      !('signature' in quote)
    )
  },
  isValidOrder: isValidOrder,
  checkOrder: checkOrder,
}
