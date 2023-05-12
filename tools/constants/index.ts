export const DOMAIN_NAME_SWAP_ERC20 = 'SWAP_ERC20'
export const DOMAIN_VERSION_SWAP_ERC20 = '4'
export const DOMAIN_NAME_SWAP = 'SWAP'
export const DOMAIN_VERSION_SWAP = '4'
export const DOMAIN_NAME_POOL = 'POOL'
export const DOMAIN_VERSION_POOL = '1'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const MAX_APPROVAL_AMOUNT = '90071992547409910000000000'
export const MIN_CONFIRMATIONS = 2
export const SECONDS_IN_DAY = 86400

export enum ChainIds {
  MAINNET = 1,
  GOERLI = 5,
  RSK = 30,
  RSKTESTNET = 31,
  BSC = 56,
  BSCTESTNET = 97,
  POLYGON = 137,
  HARDHAT = 31337,
  ARBITRUM = 42161,
  LINEA = 59140,
  FUJI = 43113,
  AVALANCHE = 43114,
  ARBITRUMGOERLI = 421613,
  MUMBAI = 80001,
}

export const mainnets: number[] = [
  ChainIds.MAINNET,
  ChainIds.RSK,
  ChainIds.BSC,
  ChainIds.POLYGON,
  ChainIds.ARBITRUM,
  ChainIds.AVALANCHE,
]

export const testnets: number[] = [
  ChainIds.GOERLI,
  ChainIds.RSKTESTNET,
  ChainIds.BSCTESTNET,
  ChainIds.MUMBAI,
  ChainIds.ARBITRUMGOERLI,
  ChainIds.FUJI,
  ChainIds.HARDHAT,
  ChainIds.LINEA,
]

export const chainNames: Record<number, string> = {
  [ChainIds.MAINNET]: 'Ethereum',
  [ChainIds.GOERLI]: 'Goerli',
  [ChainIds.RSK]: 'RSK',
  [ChainIds.RSKTESTNET]: 'RSK Testnet',
  [ChainIds.BSC]: 'BSC',
  [ChainIds.BSCTESTNET]: 'BSC Testnet',
  [ChainIds.POLYGON]: 'Polygon',
  [ChainIds.HARDHAT]: 'Hardhat',
  [ChainIds.ARBITRUM]: 'Arbitrum',
  [ChainIds.FUJI]: 'Fuji Testnet',
  [ChainIds.AVALANCHE]: 'Avalanche',
  [ChainIds.LINEA]: 'Linea',
  [ChainIds.MUMBAI]: 'Mumbai Testnet',
  [ChainIds.ARBITRUMGOERLI]: 'Arbitrum Goerli',
}

export const chainCurrencies: Record<number, string> = {
  [ChainIds.MAINNET]: 'ETH',
  [ChainIds.GOERLI]: 'ETH',
  [ChainIds.RSK]: 'RBTC',
  [ChainIds.RSKTESTNET]: 'tRBTC',
  [ChainIds.BSC]: 'BNB',
  [ChainIds.BSCTESTNET]: 'BNB',
  [ChainIds.POLYGON]: 'MATIC',
  [ChainIds.HARDHAT]: 'ETH',
  [ChainIds.ARBITRUM]: 'AETH',
  [ChainIds.FUJI]: 'AVAX',
  [ChainIds.AVALANCHE]: 'AVAX',
  [ChainIds.LINEA]: 'ETH',
  [ChainIds.MUMBAI]: 'MATIC',
  [ChainIds.ARBITRUMGOERLI]: 'AETH',
}

export const apiUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://mainnet.infura.io/v3/',
  [ChainIds.GOERLI]: 'https://goerli.infura.io/v3/',
  [ChainIds.RSK]: 'https://public-node.rsk.co',
  [ChainIds.RSKTESTNET]: 'https://public-node.testnet.rsk.co/',
  [ChainIds.BSC]: 'https://bsc-dataseed.binance.org/',
  [ChainIds.BSCTESTNET]: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  [ChainIds.POLYGON]: 'https://polygon-rpc.com/',
  [ChainIds.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [ChainIds.FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [ChainIds.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [ChainIds.LINEA]: 'https://rpc.goerli.linea.build/',
  [ChainIds.MUMBAI]: 'https://rpc-mumbai.maticvigil.com',
  [ChainIds.ARBITRUMGOERLI]: 'https://goerli-rollup.arbitrum.io/rpc',
}

export const explorerUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://etherscan.io/',
  [ChainIds.GOERLI]: 'https://goerli.etherscan.io/',
  [ChainIds.RSK]: 'https://blockscout.com/rsk/mainnet/',
  [ChainIds.RSKTESTNET]: 'https://explorer.testnet.rsk.co/',
  [ChainIds.BSC]: 'https://bscscan.com/',
  [ChainIds.BSCTESTNET]: 'https://testnet.bscscan.com/',
  [ChainIds.POLYGON]: 'https://polygonscan.com/',
  [ChainIds.ARBITRUM]: 'https://arbiscan.io/',
  [ChainIds.FUJI]: 'https://testnet.snowtrace.io/',
  [ChainIds.AVALANCHE]: 'https://snowtrace.io/',
  [ChainIds.LINEA]: 'https://explorer.goerli.linea.build/',
  [ChainIds.MUMBAI]: 'https://mumbai.polygonscan.com/',
  [ChainIds.ARBITRUMGOERLI]: 'https://goerli.arbiscan.io/',
}

export const stakingTokenAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  [ChainIds.GOERLI]: '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31',
  [ChainIds.RSK]: '0x71070c5607358fc25e3b4aaf4fb0a580c190252a',
  [ChainIds.RSKTESTNET]: '0x9c7005fa2f8476e2331f45f69e0930a4c9eff0c3',
  [ChainIds.BSC]: '0x1ac0d76f11875317f8a7d791db94cdd82bd02bd1',
  [ChainIds.BSCTESTNET]: '0xd161ddcfcc0c2d823021aa26200824efa75218d1',
  [ChainIds.POLYGON]: '0x04bEa9FCE76943E90520489cCAb84E84C0198E29',
  [ChainIds.ARBITRUM]: '0xa1135c2f2c7798d31459b5fdaef8613419be1008',
  [ChainIds.FUJI]: '0x48c427e7cEf42399e9e8300fC47875772309e995',
  [ChainIds.AVALANCHE]: '0x702d0f43edd46b77ea2d48570b02c328a20a94a1',
  [ChainIds.LINEA]: '0x2C1b868d6596a18e32E61B901E4060C872647b6C',
  [ChainIds.MUMBAI]: '0xd161ddcfcc0c2d823021aa26200824efa75218d1',
  [ChainIds.ARBITRUMGOERLI]: '0x71070c5607358fc25e3b4aaf4fb0a580c190252a',
}

export enum Protocols {
  Discovery = '0xf3713ede',
  RequestForQuoteERC20 = '0x57bb3622',
  PricingERC20 = '0x8beb22c2',
  LastLookERC20 = '0x2ca4c820',
  StorageERC20 = '0xb2256e3d',
  Storage = '0x3e4e86a3',
}

export const protocolInterfaces: Record<string, string[]> = {
  [Protocols.Discovery]: [
    'function getProtocols()',
    'function setProtocols(array((string interfaceId,(string chainId,string swapContractAddress,string walletAddress))))',
    'function getTokens()',
    'function setTokens(array(string tokenContractAddress))',
  ],
  [Protocols.RequestForQuoteERC20]: [
    'function getSignerSideOrderERC20(string chainId,string swapContractAddress,string senderAmount,string signerToken,string senderToken,string senderWallet,string proxyingFor)',
    'function getSenderSideOrderERC20(string chainId,string swapContractAddress,string signerAmount,string signerToken,string senderToken,string senderWallet,string proxyingFor)',
    'function getPricingERC20(array((string baseToken,string quoteToken)))',
    'function getAllPricingERC20()',
  ],
  [Protocols.LastLookERC20]: [
    'function subscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function subscribeAllPricingERC20()',
    'function unsubscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function unsubscribeAllPricingERC20()',
    'function setPricingERC20(array(string baseToken,string quoteToken,string minimum,array(array((string level,string price))),array(array((string level,string price)))))',
    'function considerOrderERC20(string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s)',
  ],
  [Protocols.StorageERC20]: [
    'function addOrderERC20(string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s)',
    'function getOrdersERC20(string sortField,array(string senderToken),string page,string filters,string sortOrder)',
  ],
  [Protocols.Storage]: [
    'function addOrder(uint256 nonce,uint256 expiry,uint256 protocolFee,(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),address affiliateWallet,uint256 affiliateAmount)',
    'function getOrders(string sortField,array(string senderToken),string page,string filters,string sortOrder)',
  ],
}

export const protocolNames: Record<string, string> = {
  [Protocols.Discovery]: 'Discovery',
  [Protocols.RequestForQuoteERC20]: 'Request for Quote (ERC20)',
  [Protocols.PricingERC20]: 'Pricing (ERC20)',
  [Protocols.LastLookERC20]: 'Last Look (ERC20)',
  [Protocols.StorageERC20]: 'Storage (ERC20)',
  [Protocols.Storage]: 'Storage',
}

export enum TokenKinds {
  ERC20 = '0x36372b07',
  ERC721 = '0x80ac58cd',
  ERC1155 = '0xd9b67a26',
}

export const tokenKindNames: Record<string, string> = {
  [TokenKinds.ERC20]: 'ERC20',
  [TokenKinds.ERC721]: 'ERC721',
  [TokenKinds.ERC1155]: 'ERC1155',
}
