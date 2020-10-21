import { NormalizedToken } from './types'
import { tokenKinds } from '@airswap/constants'

export const IDEX_TOKEN_API = 'https://api.idex.io/v1/assets'
export const TRUST_WALLET_IMAGE_API =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets'

export const METAMASK_IMAGE_API =
  'https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images'

export const getOpenSeaUrl = chainId => {
  switch (Number(chainId)) {
    case 4:
      return 'https://rinkeby-api.opensea.io/api/v1'
    case 1:
      return 'https://api.opensea.io/api/v1'
    default:
      throw new Error('OpenSea only supports rinkeby and mainnet')
  }
}

export const ERC20_BYTES32_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'bytes32' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'bytes32' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  { payable: true, stateMutability: 'payable', type: 'fallback' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
]

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  { payable: true, stateMutability: 'payable', type: 'fallback' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
]

export const rinkebyTokensByAddress: Record<string, NormalizedToken> = {
  '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea': {
    name: 'Dai Stablecoin',
    address: '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea',
    decimals: 18,
    symbol: 'DAI',
    kind: tokenKinds.ERC20,
  },
  '0xc778417e063141139fce010982780140aa0cd5ab': {
    name: 'Wrapped Ether',
    address: '0xc778417e063141139fce010982780140aa0cd5ab',
    decimals: 18,
    symbol: 'WETH',
    kind: tokenKinds.ERC20,
  },
  '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8': {
    name: 'AirSwap Token',
    address: '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8',
    decimals: 4,
    symbol: 'AST',
    kind: tokenKinds.ERC20,
  },
}

export const goerliTokensByAddress: Record<string, NormalizedToken> = {
  '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6': {
    name: 'Wrapped Ether',
    address: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    decimals: 18,
    symbol: 'WETH',
    kind: tokenKinds.ERC20,
  },
  '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31': {
    name: 'AirSwap Token',
    address: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
    decimals: 4,
    symbol: 'AST',
    kind: tokenKinds.ERC20,
  },
}

export const kovanTokensByAddress: Record<string, NormalizedToken> = {
  '0xd0a1e359811322d97991e03f863a0c30c2cf029c': {
    name: 'Wrapped Ether',
    address: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    decimals: 18,
    symbol: 'WETH',
    kind: tokenKinds.ERC20,
  },
  '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31': {
    name: 'AirSwap Token',
    address: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
    decimals: 4,
    symbol: 'AST',
    kind: tokenKinds.ERC20,
  },
}
