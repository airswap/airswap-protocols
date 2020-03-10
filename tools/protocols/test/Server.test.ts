import { fancy } from 'fancy-test'
import { expect } from 'chai'

import { createQuote, createOrder, signOrder } from '@airswap/utils'
import { emptySignature, ADDRESS_ZERO } from '@airswap/constants'
import { functions } from '@airswap/test-utils'

import { Server } from '..'

const badQuote = { bad: 'quote' }
const emptyQuote = createQuote({})
const wallet = functions.getTestWallet()

function mockServer(api) {
  api.post('/').reply(200, async (uri, body) => {
    const params = body['params']
    let res
    switch (body['method']) {
      case 'getMaxQuote':
        res = emptyQuote
        break
      case 'getSignerSideQuote':
        res = badQuote
        break
      case 'getSenderSideQuote':
        res = createQuote({
          signer: {
            token: params.signerToken,
            amount: params.signerAmount,
          },
          sender: {
            token: params.senderToken,
          },
        })
        break
      case 'getSenderSideOrder':
        res = createOrder({
          signer: {
            token: params.signerToken,
            amount: params.signerAmount,
          },
          sender: {
            token: params.senderToken,
            wallet: params.senderWallet,
          },
        })
        res.signature = { ...emptySignature }
        break
      case 'getSignerSideOrder':
        res = await signOrder(
          createOrder({
            signer: {
              token: params.signerToken,
            },
            sender: {
              token: params.senderToken,
              amount: params.senderAmount,
              wallet: params.senderWallet,
            },
          }),
          wallet,
          ADDRESS_ZERO
        )
        break
    }
    return {
      jsonrpc: '2.0',
      id: body['id'],
      result: res,
    }
  })
}

describe('Server:Quotes', () => {
  fancy
    .nock('https://maker.example.com', mockServer)
    .it('fails receiving a bad quote', async () => {
      try {
        await new Server('maker.example.com').getSignerSideQuote('', '', '')
      } catch (e) {
        expect(e.message).to.equal(
          'Server response is not a valid quote: {"bad":"quote"}'
        )
      }
    })

  fancy
    .nock('https://maker.example.com', mockServer)
    .it('fails receiving a request-response mismatch', async () => {
      try {
        await new Server('maker.example.com').getMaxQuote('', '')
      } catch (e) {
        expect(e.message).to.equal(
          'Server response differs from request params: signerToken,senderToken'
        )
      }
    })

  fancy
    .nock('https://maker.example.com', mockServer)
    .it('succeeds receiving a good quote', async () => {
      const quote = await new Server('maker.example.com').getSenderSideQuote(
        '1',
        'SIGNERTOKEN',
        ''
      )
      expect(quote.signer.token).to.equal('SIGNERTOKEN')
    })
})
describe('Server:Orders', () => {
  fancy
    .nock('https://maker.example.com', mockServer)
    .it('fails receiving a bad order', async () => {
      try {
        await new Server('maker.example.com').getSenderSideOrder('', '', '', '')
      } catch (e) {
        expect(
          e.message.indexOf('Server response is not a valid order')
        ).to.equal(0)
      }
    })
  fancy
    .nock('https://maker.example.com', mockServer)
    .it('succeeds receiving a good order', async () => {
      const order = await new Server('maker.example.com').getSignerSideOrder(
        '0',
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        ADDRESS_ZERO
      )
      expect(order.signer.token).to.equal(ADDRESS_ZERO)
    })
})
