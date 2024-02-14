require('dotenv').config({ path: '../../.env' })
const { SchemaFieldTypes } = require('redis')

export default async function reset(client) {
  await client.ft.create(
    'index:ordersBySigner',
    {
      '$.chainId': {
        type: SchemaFieldTypes.NUMERIC,
        AS: 'chainId',
      },
      '$.nonce': {
        type: SchemaFieldTypes.TEXT,
        AS: 'nonce',
      },
      '$.expiry': {
        type: SchemaFieldTypes.TEXT,
        AS: 'expiry',
      },
      '$.signer.wallet': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerWallet',
      },
      '$.signer.token': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerToken',
      },
      '$.signer.amount': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerAmount',
      },
      '$.signer.id': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerId',
      },
      '$.sender.amount': {
        type: SchemaFieldTypes.TEXT,
        AS: 'senderAmount',
      },
      '$.sender.token': {
        type: SchemaFieldTypes.TEXT,
        AS: 'senderToken',
      },
      '$.tags.*': {
        type: SchemaFieldTypes.TAG,
        AS: 'tags',
      },
    },
    {
      ON: 'JSON',
    }
  )
}
