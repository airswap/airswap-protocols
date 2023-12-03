export const DOMAIN_NAME_SWAP_ERC20 = 'SWAP_ERC20'
export const DOMAIN_VERSION_SWAP_ERC20 = '4.1'
export const DOMAIN_NAME_SWAP = 'SWAP'
export const DOMAIN_VERSION_SWAP = '4'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const MAX_APPROVAL_AMOUNT = '90071992547409910000000000'
export const MIN_CONFIRMATIONS = 2
export const SECONDS_IN_DAY = 86400

export enum ChainIds {
  MAINNET = 1,
  GOERLI = 5,
  RSK = 30,
  RSKTESTNET = 31,
  TELOS = 40,
  TELOSTESTNET = 41,
  BSC = 56,
  BSCTESTNET = 97,
  POLYGON = 137,
  BASE = 8453,
  HARDHAT = 31337,
  ARBITRUM = 42161,
  FUJI = 43113,
  AVALANCHE = 43114,
  LINEAGOERLI = 59140,
  LINEA = 59144,
  MUMBAI = 80001,
  BASEGOERLI = 84531,
  ARBITRUMGOERLI = 421613,
  SEPOLIA = 11155111,
}

export const mainnets: number[] = [
  ChainIds.MAINNET,
  ChainIds.RSK,
  ChainIds.TELOS,
  ChainIds.BSC,
  ChainIds.POLYGON,
  ChainIds.BASE,
  ChainIds.ARBITRUM,
  ChainIds.AVALANCHE,
  ChainIds.LINEA,
]

export const testnets: number[] = [
  ChainIds.GOERLI,
  ChainIds.RSKTESTNET,
  ChainIds.TELOSTESTNET,
  ChainIds.BSCTESTNET,
  ChainIds.HARDHAT,
  ChainIds.FUJI,
  ChainIds.LINEAGOERLI,
  ChainIds.MUMBAI,
  ChainIds.BASEGOERLI,
  ChainIds.ARBITRUMGOERLI,
  ChainIds.SEPOLIA,
]

export const chainLabels: Record<number, string> = {
  [ChainIds.MAINNET]: 'MAINNET',
  [ChainIds.GOERLI]: 'GOERLI',
  [ChainIds.RSK]: 'RSK',
  [ChainIds.RSKTESTNET]: 'RSKTESTNET',
  [ChainIds.TELOS]: 'TELOS',
  [ChainIds.TELOSTESTNET]: 'TELOSTESTNET',
  [ChainIds.BSC]: 'BSC',
  [ChainIds.BSCTESTNET]: 'BSCTESTNET',
  [ChainIds.POLYGON]: 'POLYGON',
  [ChainIds.BASE]: 'BASE',
  [ChainIds.HARDHAT]: 'HARDHAT',
  [ChainIds.ARBITRUM]: 'ARBITRUM',
  [ChainIds.FUJI]: 'FUJI',
  [ChainIds.AVALANCHE]: 'AVALANCHE',
  [ChainIds.LINEAGOERLI]: 'LINEAGOERLI',
  [ChainIds.LINEA]: 'LINEA',
  [ChainIds.MUMBAI]: 'MUMBAI',
  [ChainIds.BASEGOERLI]: 'BASEGOERLI',
  [ChainIds.ARBITRUMGOERLI]: 'ARBITRUMGOERLI',
  [ChainIds.SEPOLIA]: 'SEPOLIA',
}

export const chainNames: Record<number, string> = {
  [ChainIds.MAINNET]: 'Ethereum',
  [ChainIds.GOERLI]: 'Goerli',
  [ChainIds.RSK]: 'RSK',
  [ChainIds.RSKTESTNET]: 'RSK Testnet',
  [ChainIds.TELOS]: 'Telos',
  [ChainIds.TELOSTESTNET]: 'Telos Testnet',
  [ChainIds.BSC]: 'BSC',
  [ChainIds.BSCTESTNET]: 'BSC Testnet',
  [ChainIds.POLYGON]: 'Polygon',
  [ChainIds.BASE]: 'Base',
  [ChainIds.HARDHAT]: 'Hardhat',
  [ChainIds.ARBITRUM]: 'Arbitrum',
  [ChainIds.FUJI]: 'Fuji Testnet',
  [ChainIds.AVALANCHE]: 'Avalanche',
  [ChainIds.LINEAGOERLI]: 'Linea Goerli',
  [ChainIds.LINEA]: 'Linea',
  [ChainIds.MUMBAI]: 'Mumbai Testnet',
  [ChainIds.BASEGOERLI]: 'Base Goerli',
  [ChainIds.ARBITRUMGOERLI]: 'Arbitrum Goerli',
  [ChainIds.SEPOLIA]: 'Sepolia',
}

export const chainCurrencies: Record<number, string> = {
  [ChainIds.MAINNET]: 'ETH',
  [ChainIds.GOERLI]: 'GoerliETH',
  [ChainIds.RSK]: 'RBTC',
  [ChainIds.RSKTESTNET]: 'tRBTC',
  [ChainIds.TELOS]: 'TLOS',
  [ChainIds.TELOSTESTNET]: 'TLOS',
  [ChainIds.BSC]: 'BNB',
  [ChainIds.BSCTESTNET]: 'BNB',
  [ChainIds.POLYGON]: 'MATIC',
  [ChainIds.BASE]: 'ETH',
  [ChainIds.HARDHAT]: 'ETH',
  [ChainIds.ARBITRUM]: 'AETH',
  [ChainIds.FUJI]: 'AVAX',
  [ChainIds.AVALANCHE]: 'AVAX',
  [ChainIds.LINEAGOERLI]: 'ETH',
  [ChainIds.LINEA]: 'ETH',
  [ChainIds.MUMBAI]: 'MATIC',
  [ChainIds.BASEGOERLI]: 'ETH',
  [ChainIds.ARBITRUMGOERLI]: 'AETH',
  [ChainIds.SEPOLIA]: 'SepoliaETH',
}

export const apiUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://mainnet.infura.io/v3',
  [ChainIds.GOERLI]: 'https://goerli.infura.io/v3',
  [ChainIds.RSK]: 'https://public-node.rsk.co',
  [ChainIds.RSKTESTNET]: 'https://public-node.testnet.rsk.co',
  [ChainIds.TELOS]: 'https://mainnet.telos.net/evm',
  [ChainIds.TELOSTESTNET]: 'https://testnet.telos.net/evm',
  [ChainIds.BSC]: 'https://bsc-dataseed.binance.org',
  [ChainIds.BSCTESTNET]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [ChainIds.POLYGON]: 'https://polygon-rpc.com',
  [ChainIds.BASE]: 'https://mainnet.base.org',
  [ChainIds.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [ChainIds.FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [ChainIds.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [ChainIds.LINEAGOERLI]: 'https://rpc.goerli.linea.build',
  [ChainIds.LINEA]: 'https://linea-mainnet.infura.io/v3',
  [ChainIds.MUMBAI]: 'https://rpc-mumbai.maticvigil.com',
  [ChainIds.BASEGOERLI]: 'https://goerli.base.org',
  [ChainIds.ARBITRUMGOERLI]: 'https://goerli-rollup.arbitrum.io/rpc',
  [ChainIds.SEPOLIA]: 'https://sepolia.infura.io/v3',
}

export const explorerUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://etherscan.io',
  [ChainIds.GOERLI]: 'https://goerli.etherscan.io',
  [ChainIds.RSK]: 'https://rootstock.blockscout.com',
  [ChainIds.RSKTESTNET]: 'https://rootstock-testnet.blockscout.com',
  [ChainIds.TELOS]: 'https://teloscan.io',
  [ChainIds.TELOSTESTNET]: 'https://testnet.teloscan.io',
  [ChainIds.BSC]: 'https://bscscan.com',
  [ChainIds.BSCTESTNET]: 'https://testnet.bscscan.com',
  [ChainIds.POLYGON]: 'https://polygonscan.com',
  [ChainIds.BASE]: 'https://basescan.org',
  [ChainIds.ARBITRUM]: 'https://arbiscan.io',
  [ChainIds.FUJI]: 'https://testnet.snowtrace.io',
  [ChainIds.AVALANCHE]: 'https://snowtrace.io',
  [ChainIds.LINEAGOERLI]: 'https://goerli.lineascan.build',
  [ChainIds.LINEA]: 'https://lineascan.build',
  [ChainIds.MUMBAI]: 'https://mumbai.polygonscan.com',
  [ChainIds.BASEGOERLI]: 'https://goerli.basescan.org',
  [ChainIds.ARBITRUMGOERLI]: 'https://goerli.arbiscan.io',
  [ChainIds.SEPOLIA]: 'https://sepolia.etherscan.io/',
}

export const explorerApiUrls: Record<number, string> = {
  [ChainIds.RSK]: 'https://rootstock.blockscout.com/api',
  [ChainIds.RSKTESTNET]: 'https://rootstock-testnet.blockscout.com/api',
  [ChainIds.LINEAGOERLI]: 'https://api-testnet.lineascan.build/api',
  [ChainIds.LINEA]: 'https://api.lineascan.build/api',
  [ChainIds.BASEGOERLI]: 'https://api-goerli.basescan.org/api',
  [ChainIds.BASE]: 'https://api.basescan.org/api',
  [ChainIds.ARBITRUMGOERLI]: 'https://api-goerli.arbiscan.io/api',
}

export const stakingTokenAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  [ChainIds.GOERLI]: '0x7eef7238fd4f65312a53c5d195e675068afbb1d0',
  [ChainIds.SEPOLIA]: '0x5e5a433cdfb14ab228c45e23251ad83f7b1e3302',
}

export const ownerAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0xf8bB149F9525875Fa47B8CC632d368EB600FAba3',
  [ChainIds.RSK]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.TELOS]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.BSC]: '0x86C99b6dDC7A884db8b424B40b96Dc4043F19E37',
  [ChainIds.POLYGON]: '0x4fef02E54160e6D7af83961d355B3B2E283506c5',
  [ChainIds.BASE]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.ARBITRUM]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.AVALANCHE]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.LINEA]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
}

export const protocolFeeReceiverAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0xaD30f7EEBD9Bd5150a256F47DA41d4403033CdF0',
}

export enum Protocols {
  Discovery = '0xf3713ede',
  RequestForQuoteERC20 = '0x02ad05d3',
  LastLookERC20 = '0x395ca9f1',
  StorageERC20 = '0xfdd616a7',
  Storage = '0xd8b0f31f',
}

export const protocolInterfaces: Record<string, string[]> = {
  [Protocols.Discovery]: [
    'function getProtocols()',
    'function setProtocols(array((string interfaceId,(string chainId,string swapContractAddress,string walletAddress))))',
    'function getTokens()',
    'function setTokens(array(string tokenContractAddress))',
  ],
  [Protocols.RequestForQuoteERC20]: [
    'function getSignerSideOrderERC20(string chainId,string swapContractAddress,string senderAmount,string signerToken,string senderToken,string senderWallet,string minExpiry,string proxyingFor)',
    'function getSenderSideOrderERC20(string chainId,string swapContractAddress,string signerAmount,string signerToken,string senderToken,string senderWallet,string minExpiry,string proxyingFor)',
    'function getPricingERC20(array((string baseToken,string quoteToken)),string minExpiry)',
    'function getAllPricingERC20(string minExpiry)',
  ],
  [Protocols.LastLookERC20]: [
    'function subscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function subscribeAllPricingERC20()',
    'function unsubscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function unsubscribeAllPricingERC20()',
    'function setPricingERC20(array(string baseToken,string quoteToken,string minimum,array(array((string level,string price))),array(array((string level,string price)))))',
    'function considerOrderERC20(string chainId,string swapContractAddress,string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s)',
  ],
  [Protocols.StorageERC20]: [
    'function addOrderERC20(string chainId,string swapContractAddress,string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s)',
    'function getOrdersERC20((string signerWallet,array(string signerToken),string signerMinAmount,string signerMaxAmount,string senderWallet,array(string senderToken),string senderMinAmount,string senderMaxAmount,string sortField,string sortOrder,string offset,string limit))',
  ],
  [Protocols.Storage]: [
    'function addOrder(string chainId,string swapContractAddress,uint256 nonce,uint256 expiry,uint256 protocolFee,(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),address affiliateWallet,uint256 affiliateAmount)',
    'function getOrders((string signerWallet,array(string signerToken),string signerMinAmount,string signerMaxAmount,string senderWallet,array(string senderToken),string senderMinAmount,string senderMaxAmount,string sortField,string sortOrder,string offset,string limit))',
  ],
}

export const protocolNames: Record<string, string> = {
  [Protocols.Discovery]: 'Discovery',
  [Protocols.RequestForQuoteERC20]: 'Request for Quote (ERC20)',
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
