export const DOMAIN_NAME_SWAP_ERC20 = 'SWAP_ERC20'
export const DOMAIN_VERSION_SWAP_ERC20 = '3'
export const DOMAIN_NAME_SWAP = 'SWAP'
export const DOMAIN_VERSION_SWAP = '3'
export const DOMAIN_NAME_POOL = 'POOL'
export const DOMAIN_VERSION_POOL = '1'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const MAX_LOCATORS = 10
export const MAX_APPROVAL_AMOUNT = '90071992547409910000000000'
export const MIN_CONFIRMATIONS = 2
export const DEFAULT_PORT = 3000
export const REQUEST_TIMEOUT = 4000
export const SECONDS_IN_DAY = 86400

export const chainIds: Record<string, number> = {
  ETHEREUM: 1,
  GOERLI: 5,
  RSK: 30,
  RSKTESTNET: 31,
  KOVAN: 42,
  BSC: 56,
  BSCTESTNET: 97,
  POLYGON: 137,
  HARDHAT: 31337,
  ARBITRUM: 42161,
  ARBITRUMGOERLI: 421613,
  FUJI: 43113,
  AVALANCHE: 43114,
  MUMBAI: 80001,
}

export const chainNames: Record<number, string> = {
  1: 'ETHEREUM',
  5: 'GOERLI',
  30: 'RSK',
  31: 'RSKTESTNET',
  42: 'KOVAN',
  56: 'BSC',
  97: 'BSCTESTNET',
  137: 'POLYGON',
  31337: 'HARDHAT',
  42161: 'ARBITRUM',
  43113: 'FUJI',
  43114: 'AVALANCHE',
  80001: 'MUMBAI',
  421613: 'ARBITRUMGOERLI',
}

export const mainnets: number[] = [1, 30, 56, 137, 42161, 43114]

export const testnets: number[] = [5, 31, 97, 31337, 80001, 421613, 43113]

export const chainCurrencies: Record<number, string> = {
  1: 'ETH',
  5: 'ETH',
  30: 'RBTC',
  31: 'tRBTC',
  42: 'ETH',
  56: 'BNB',
  97: 'BNB',
  137: 'MATIC',
  31337: 'ETH',
  42161: 'AETH',
  421613: 'AETH',
  43113: 'AVAX',
  43114: 'AVAX',
  80001: 'MATIC',
}

export const wrappedTokenAddresses: Record<number, string> = {
  1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  5: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
  30: '0x967f8799af07df1534d48a95a5c9febe92c53ae0',
  31: '0x09b6ca5e4496238a1f176aea6bb607db96c2286e',
  42: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  137: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  43113: '0xd9d01a9f7c810ec035c0e42cb9e80ef44d7f8692',
  43114: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  80001: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
  421613: '0xee01c0cd76354c383b8c7b4e65ea88d00b06f36f',
}

export const stakingTokenAddresses: Record<number, string> = {
  1: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  5: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
  30: '0x71070c5607358fc25e3b4aaf4fb0a580c190252a',
  31: '0x9c7005fa2f8476e2331f45f69e0930a4c9eff0c3',
  42: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
  56: '0x1ac0d76f11875317f8a7d791db94cdd82bd02bd1',
  97: '0xd161ddcfcc0c2d823021aa26200824efa75218d1',
  137: '0x04bEa9FCE76943E90520489cCAb84E84C0198E29',
  42161: '0xa1135c2f2c7798d31459b5fdaef8613419be1008',
  43113: '0x48c427e7cEf42399e9e8300fC47875772309e995',
  43114: '0x702d0f43edd46b77ea2d48570b02c328a20a94a1',
  80001: '0xd161ddcfcc0c2d823021aa26200824efa75218d1',
  421613: '0x71070c5607358fc25e3b4aaf4fb0a580c190252a',
}

export const etherscanDomains: Record<number, string> = {
  1: 'etherscan.io',
  5: 'goerli.etherscan.io',
  30: 'blockscout.com/rsk/mainnet',
  31: 'explorer.testnet.rsk.co',
  42: 'kovan.etherscan.io',
  56: 'bscscan.com',
  97: 'testnet.bscscan.com',
  137: 'polygonscan.com',
  42161: 'arbiscan.io',
  43113: 'testnet.snowtrace.io',
  43114: 'snowtrace.io',
  80001: 'mumbai.polygonscan.com',
  421613: 'goerli.arbiscan.io',
}

export enum TokenKinds {
  ERC20 = '0x36372b07',
  ERC721 = '0x80ac58cd',
  ERC1155 = '0xd9b67a26',
  ERC777 = '0xe58e113c',
  CKITTY = '0x9a20483d',
}

export const tokenKinds = {
  ERC20: TokenKinds.ERC20,
  ERC721: TokenKinds.ERC721,
  ERC1155: TokenKinds.ERC1155,
  ERC777: TokenKinds.ERC777,
  CKITTY: TokenKinds.CKITTY,
}

export const tokenKindNames: Record<string, string> = {
  '0x36372b07': 'ERC20',
  '0x80ac58cd': 'ERC721',
  '0xd9b67a26': 'ERC1155',
  '0xe58e113c': 'ERC777',
  '0x9a20483d': 'CKITTY',
}
