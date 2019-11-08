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
const web3Eth = require('web3-eth')

const { SECONDS_IN_DAY, defaults, EMPTY_ADDRESS } = require('./constants')

const IERC20 = require('@airswap/tokens/build/contracts/IERC20.json')
const Swap = require('@airswap/swap/build/contracts/Swap.json')

const signatures = require('./signatures')

let nonce = 100

let getLatestTimestamp = async () => {
  return (await web3Eth.getBlock('latest')).timestamp
}

// network is 'rinkeby' , 'mainnet' etc
let checkOrder = async (order, network) => {
  let errors = []
  const provider = ethers.getDefaultProvider(network)

  // Check the order has all necessary fields
  if (!isValidOrder(order)) {
    errors.push('Order structured incorrectly')
    return errors
  }

  // Check swap address provided
  if (order['signature']['validator'] == EMPTY_ADDRESS) {
    errors.push('Order.signature.validator cannot be 0')
    return errors
  }

  // Check signer balance and allowance
  errors = await checkBalanceAndApproval(order, 'signer', provider, errors)

  // If sender, check balance and allowance
  if (order['sender']['wallet'] != EMPTY_ADDRESS) {
    errors = await checkBalanceAndApproval(order, 'sender', provider, errors)
  }

  // If affiliate, check balance and allowance
  if (order['affiliate']['wallet'] != EMPTY_ADDRESS) {
    errors = await checkBalanceAndApproval(order, 'affiliate', provider, errors)
  }

  // Check nonce availability
  errors = await checkNonce(
    order['signature']['validator'],
    order['signer']['wallet'],
    order['nonce'],
    provider,
    errors
  )

  // Check order expiry
  let latestBlock = await provider.getBlock(provider.getBlockNumber())
  if (latestBlock.timestamp >= order['expiry']) {
    errors.push('Order expiry has passed')
  }

  // Check order signature
  if (order['signature']['v'] != 0) {
    errors = await checkOrderSignature(order, provider, errors)
  }

  return errors
}

let checkOrderSignature = async (order, provider, errors) => {
  // Check signature is valid
  const isValid = signatures.isSignatureValid(order)
  if (!isValid) {
    errors.push('Signature invalid')
  }

  // Check signer authorized signatory
  if (order['signature']['signatory'] != order['signer']['wallet']) {
    const swapContract = new ethers.Contract(
      order['signature']['validator'],
      Swap.abi,
      provider
    )

    await swapContract
      .isSignerAuthorized(
        order['signer']['wallet'],
        order['signature']['signatory']
      )
      .then(isAuthorized => {
        if (!isAuthorized) {
          errors.push(`Signatory not authorized`)
        }
      })
  }
  return errors
}

let checkBalanceAndApproval = async (order, partyName, provider, errors) => {
  let party = order[partyName]

  // If this is the affiliate, tokens come from the signer instead
  if (partyName == 'affiliate') {
    party['wallet'] = order['signer']['wallet']
  }

  const tokenContract = new ethers.Contract(
    party['token'],
    IERC20.abi,
    provider
  )

  // Check balance
  await tokenContract.balanceOf(party['wallet']).then(balance => {
    if (balance.lt(party['param'])) {
      errors.push(`${partyName} balance is too low`)
    }
  })

  // check approval
  await tokenContract
    .allowance(party['wallet'], order['signature']['validator'])
    .then(allowance => {
      if (allowance.lt(party['param'])) {
        errors.push(`${partyName} allowance is too low`)
      }
    })
  return errors
}

let checkNonce = async (swapAddress, signer, nonce, provider, errors) => {
  const swapContract = new ethers.Contract(swapAddress, Swap.abi, provider)

  // check not cancelled
  await swapContract.signerNonceStatus(signer, nonce).then(status => {
    if (status == '0x01') {
      errors.push(`Nonce taken or cancelled`)
    }
  })

  // check above minimum
  await swapContract.signerMinimumNonce(signer).then(minimum => {
    if (minimum > nonce) {
      errors.push(`Nonce too low`)
    }
  })
  return errors
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
        order.signature = signatures.getEmptySignature(this._verifyingContract)
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
