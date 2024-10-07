export const DOMAIN_NAME_SWAP_ERC20 = 'SWAP_ERC20'
export const DOMAIN_VERSION_SWAP_ERC20 = '4.3'
export const DOMAIN_NAME_SWAP = 'SWAP'
export const DOMAIN_VERSION_SWAP = '4.2'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const SECONDS_IN_DAY = 86400
export const THIRTY_DAYS = 86400 * 30
export const EVM_NATIVE_TOKEN_DECIMALS = 18

export enum ChainIds {
  MAINNET = 1,
  RSK = 30,
  RSKTESTNET = 31,
  TELOS = 40,
  TELOSTESTNET = 41,
  BSC = 56,
  BSCTESTNET = 97,
  POLYGON = 137,
  BASE = 8453,
  HOLESKY = 17000,
  HARDHAT = 31337,
  ARBITRUM = 42161,
  FUJI = 43113,
  AVALANCHE = 43114,
  LINEAGOERLI = 59140,
  LINEA = 59144,
  MUMBAI = 80001,
  BASESEPOLIA = 84532,
  ARBITRUMSEPOLIA = 421614,
  SEPOLIA = 11155111,
  NEON = 245022934,
  NEONDEVNET = 245022926,
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
  ChainIds.NEON,
]

export const testnets: number[] = [
  ChainIds.RSKTESTNET,
  ChainIds.TELOSTESTNET,
  ChainIds.BSCTESTNET,
  ChainIds.HOLESKY,
  ChainIds.FUJI,
  ChainIds.LINEAGOERLI,
  ChainIds.MUMBAI,
  ChainIds.BASESEPOLIA,
  ChainIds.ARBITRUMSEPOLIA,
  ChainIds.SEPOLIA,
  ChainIds.NEONDEVNET,
]

export const chainLabels: Record<number, string> = {
  [ChainIds.MAINNET]: 'MAINNET',
  [ChainIds.RSK]: 'RSK',
  [ChainIds.RSKTESTNET]: 'RSKTESTNET',
  [ChainIds.TELOS]: 'TELOS',
  [ChainIds.TELOSTESTNET]: 'TELOSTESTNET',
  [ChainIds.BSC]: 'BSC',
  [ChainIds.BSCTESTNET]: 'BSCTESTNET',
  [ChainIds.POLYGON]: 'POLYGON',
  [ChainIds.BASE]: 'BASE',
  [ChainIds.HOLESKY]: 'HOLESKY',
  [ChainIds.HARDHAT]: 'HARDHAT',
  [ChainIds.ARBITRUM]: 'ARBITRUM',
  [ChainIds.FUJI]: 'FUJI',
  [ChainIds.AVALANCHE]: 'AVALANCHE',
  [ChainIds.LINEAGOERLI]: 'LINEAGOERLI',
  [ChainIds.LINEA]: 'LINEA',
  [ChainIds.MUMBAI]: 'MUMBAI',
  [ChainIds.BASESEPOLIA]: 'BASESEPOLIA',
  [ChainIds.ARBITRUMSEPOLIA]: 'ARBITRUMSEPOLIA',
  [ChainIds.SEPOLIA]: 'SEPOLIA',
  [ChainIds.NEON]: 'NEON',
  [ChainIds.NEONDEVNET]: 'NEONDEVNET',
}

export const chainNames: Record<number, string> = {
  [ChainIds.MAINNET]: 'Ethereum',
  [ChainIds.RSK]: 'RSK',
  [ChainIds.RSKTESTNET]: 'RSK Testnet',
  [ChainIds.TELOS]: 'Telos',
  [ChainIds.TELOSTESTNET]: 'Telos Testnet',
  [ChainIds.BSC]: 'BSC',
  [ChainIds.BSCTESTNET]: 'BSC Testnet',
  [ChainIds.POLYGON]: 'Polygon',
  [ChainIds.BASE]: 'Base',
  [ChainIds.HOLESKY]: 'Holesky',
  [ChainIds.HARDHAT]: 'Hardhat',
  [ChainIds.ARBITRUM]: 'Arbitrum',
  [ChainIds.FUJI]: 'Fuji Testnet',
  [ChainIds.AVALANCHE]: 'Avalanche',
  [ChainIds.LINEAGOERLI]: 'Linea Goerli',
  [ChainIds.LINEA]: 'Linea',
  [ChainIds.MUMBAI]: 'Mumbai Testnet',
  [ChainIds.BASESEPOLIA]: 'Base Sepolia',
  [ChainIds.ARBITRUMSEPOLIA]: 'Arbitrum Sepolia',
  [ChainIds.SEPOLIA]: 'Sepolia',
  [ChainIds.NEON]: 'Neon',
  [ChainIds.NEONDEVNET]: 'Neon Devnet',
}

export const chainCurrencies: Record<number, string> = {
  [ChainIds.MAINNET]: 'ETH',
  [ChainIds.RSK]: 'RBTC',
  [ChainIds.RSKTESTNET]: 'tRBTC',
  [ChainIds.TELOS]: 'TLOS',
  [ChainIds.TELOSTESTNET]: 'TLOS',
  [ChainIds.BSC]: 'BNB',
  [ChainIds.BSCTESTNET]: 'BNB',
  [ChainIds.POLYGON]: 'MATIC',
  [ChainIds.BASE]: 'ETH',
  [ChainIds.HOLESKY]: 'HoleskyETH',
  [ChainIds.HARDHAT]: 'ETH',
  [ChainIds.ARBITRUM]: 'AETH',
  [ChainIds.FUJI]: 'AVAX',
  [ChainIds.AVALANCHE]: 'AVAX',
  [ChainIds.LINEAGOERLI]: 'ETH',
  [ChainIds.LINEA]: 'ETH',
  [ChainIds.MUMBAI]: 'MATIC',
  [ChainIds.BASESEPOLIA]: 'ETH',
  [ChainIds.ARBITRUMSEPOLIA]: 'AETH',
  [ChainIds.SEPOLIA]: 'SepoliaETH',
  [ChainIds.NEON]: 'NEON',
  [ChainIds.NEONDEVNET]: 'NEONDEVNET',
}

export const currencyIcons: Record<number, number> = {
  [ChainIds.MAINNET]: ChainIds.MAINNET,
  [ChainIds.RSK]: ChainIds.RSK,
  [ChainIds.RSKTESTNET]: ChainIds.RSK,
  [ChainIds.TELOS]: ChainIds.TELOS,
  [ChainIds.TELOSTESTNET]: ChainIds.TELOS,
  [ChainIds.BSC]: ChainIds.BSC,
  [ChainIds.BSCTESTNET]: ChainIds.BSC,
  [ChainIds.POLYGON]: ChainIds.POLYGON,
  [ChainIds.BASE]: ChainIds.MAINNET,
  [ChainIds.HOLESKY]: ChainIds.MAINNET,
  [ChainIds.ARBITRUM]: ChainIds.MAINNET,
  [ChainIds.FUJI]: ChainIds.AVALANCHE,
  [ChainIds.AVALANCHE]: ChainIds.AVALANCHE,
  [ChainIds.LINEAGOERLI]: ChainIds.MAINNET,
  [ChainIds.LINEA]: ChainIds.MAINNET,
  [ChainIds.MUMBAI]: ChainIds.POLYGON,
  [ChainIds.BASESEPOLIA]: ChainIds.MAINNET,
  [ChainIds.ARBITRUMSEPOLIA]: ChainIds.MAINNET,
  [ChainIds.SEPOLIA]: ChainIds.MAINNET,
  [ChainIds.NEON]: ChainIds.NEON,
  [ChainIds.NEONDEVNET]: ChainIds.NEONDEVNET,
}

export const apiUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://ethereum.publicnode.com',
  [ChainIds.RSK]: 'https://public-node.rsk.co',
  [ChainIds.RSKTESTNET]: 'https://public-node.testnet.rsk.co',
  [ChainIds.TELOS]: 'https://mainnet.telos.net/evm',
  [ChainIds.TELOSTESTNET]: 'https://testnet.telos.net/evm',
  [ChainIds.BSC]: 'https://bsc-dataseed.binance.org',
  [ChainIds.BSCTESTNET]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [ChainIds.POLYGON]: 'https://polygon-rpc.com',
  [ChainIds.BASE]: 'https://base.publicnode.com',
  [ChainIds.HOLESKY]: 'https://ethereum-holesky.publicnode.com',
  [ChainIds.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [ChainIds.FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [ChainIds.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [ChainIds.LINEAGOERLI]: 'https://rpc.goerli.linea.build',
  [ChainIds.LINEA]: 'https://rpc.linea.build',
  [ChainIds.MUMBAI]: 'https://gateway.tenderly.co/public/polygon-mumbai',
  [ChainIds.BASESEPOLIA]: 'https://sepolia.base.org',
  [ChainIds.ARBITRUMSEPOLIA]: 'https://sepolia-rollup.arbitrum.io/rpc',
  [ChainIds.SEPOLIA]: 'https://ethereum-sepolia.publicnode.com',
  [ChainIds.NEON]: 'https://neon-proxy-mainnet.solana.p2p.org',
  [ChainIds.NEONDEVNET]: 'https://devnet.neonevm.org',
}

export const explorerUrls: Record<number, string> = {
  [ChainIds.MAINNET]: 'https://etherscan.io',
  [ChainIds.RSK]: 'https://rootstock.blockscout.com',
  [ChainIds.RSKTESTNET]: 'https://rootstock-testnet.blockscout.com',
  [ChainIds.TELOS]: 'https://teloscan.io',
  [ChainIds.TELOSTESTNET]: 'https://testnet.teloscan.io',
  [ChainIds.BSC]: 'https://bscscan.com',
  [ChainIds.BSCTESTNET]: 'https://testnet.bscscan.com',
  [ChainIds.POLYGON]: 'https://polygonscan.com',
  [ChainIds.BASE]: 'https://basescan.org',
  [ChainIds.HOLESKY]: 'https://holesky.etherscan.io',
  [ChainIds.ARBITRUM]: 'https://arbiscan.io',
  [ChainIds.FUJI]: 'https://testnet.snowtrace.io',
  [ChainIds.AVALANCHE]: 'https://snowtrace.io',
  [ChainIds.LINEAGOERLI]: 'https://goerli.lineascan.build',
  [ChainIds.LINEA]: 'https://lineascan.build',
  [ChainIds.MUMBAI]: 'https://mumbai.polygonscan.com',
  [ChainIds.BASESEPOLIA]: 'https://sepolia.basescan.org',
  [ChainIds.ARBITRUMSEPOLIA]: 'https://sepolia.arbiscan.io',
  [ChainIds.SEPOLIA]: 'https://sepolia.etherscan.io',
  [ChainIds.NEON]: 'https://neonscan.org',
  [ChainIds.NEONDEVNET]: 'https://devnet.neonscan.org/',
}

export const explorerApiUrls: Record<number, string> = {
  [ChainIds.RSK]: 'https://rootstock.blockscout.com/api',
  [ChainIds.RSKTESTNET]: 'https://rootstock-testnet.blockscout.com/api',
  [ChainIds.HOLESKY]: 'https://api-holesky.etherscan.io/api',
  [ChainIds.LINEAGOERLI]: 'https://api-testnet.lineascan.build/api',
  [ChainIds.LINEA]: 'https://api.lineascan.build/api',
  [ChainIds.BASESEPOLIA]: 'https://api-sepolia.basescan.org/api',
  [ChainIds.BASE]: 'https://api.basescan.org/api',
  [ChainIds.ARBITRUMSEPOLIA]: 'https://api-sepolia.arbiscan.io/api',
  [ChainIds.NEON]: 'https://api.neonscan.org/hardhat/verify',
  [ChainIds.NEONDEVNET]: 'https://devnet-api.neonscan.org/hardhat/verify',
}

export const stakingTokenAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
  [ChainIds.SEPOLIA]: '0x4092d6dba9abb7450b9d91aa7ed2712935d63b39',
  [ChainIds.HOLESKY]: '0x4092d6dba9abb7450b9d91aa7ed2712935d63b39',
}

export const wrappedNativeTokenAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  [ChainIds.RSK]: '0x967f8799af07df1534d48a95a5c9febe92c53ae0',
  [ChainIds.RSKTESTNET]: '0x09b6ca5e4496238a1f176aea6bb607db96c2286e',
  [ChainIds.TELOS]: '0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E',
  [ChainIds.TELOSTESTNET]: '0xaE85Bf723A9e74d6c663dd226996AC1b8d075AA9',
  [ChainIds.BSC]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [ChainIds.BSCTESTNET]: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  [ChainIds.POLYGON]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [ChainIds.BASE]: '0x4200000000000000000000000000000000000006',
  [ChainIds.HOLESKY]: '0x94373a4919b3240d86ea41593d5eba789fef3848',
  [ChainIds.ARBITRUM]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  [ChainIds.FUJI]: '0xd9d01a9f7c810ec035c0e42cb9e80ef44d7f8692',
  [ChainIds.AVALANCHE]: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  [ChainIds.LINEAGOERLI]: '0x2C1b868d6596a18e32E61B901E4060C872647b6C',
  [ChainIds.LINEA]: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
  [ChainIds.MUMBAI]: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
  [ChainIds.BASESEPOLIA]: '0x4200000000000000000000000000000000000006',
  [ChainIds.ARBITRUMSEPOLIA]: '0x0091f4e75a03c11cb9be8e3717219005eb780d89',
  [ChainIds.SEPOLIA]: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
  [ChainIds.NEON]: '0x202C35e517Fa803B537565c40F0a6965D7204609',
  [ChainIds.NEONDEVNET]: '0x11adC2d986E334137b9ad0a0F290771F31e9517F',
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
  [ChainIds.SEPOLIA]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
  [ChainIds.NEON]: '0xed669F5fe2A37Ef204DB178c7a982717B9f03Ec2',
}

export const protocolFeeReceiverAddresses: Record<number, string> = {
  [ChainIds.MAINNET]: '0xaD30f7EEBD9Bd5150a256F47DA41d4403033CdF0',
}

export enum ProtocolIds {
  Discovery = '0xf3713ede',
  RequestForQuoteERC20 = '0x02ad05d3',
  LastLookERC20 = '0x395ca9f1',
  IndexingERC20 = '0x85ccc7d5',
  Indexing = '0x9498325a',
}

export const protocolNames: Record<string, string> = {
  [ProtocolIds.Discovery]: 'Discovery',
  [ProtocolIds.RequestForQuoteERC20]: 'Request for Quote (ERC20)',
  [ProtocolIds.LastLookERC20]: 'Last Look (ERC20)',
  [ProtocolIds.IndexingERC20]: 'Indexing (ERC20)',
  [ProtocolIds.Indexing]: 'Indexing',
}

export const protocolInterfaces: Record<string, string[]> = {
  [ProtocolIds.Discovery]: [
    'function getProtocols()',
    'function setProtocols(array((string interfaceId,(string chainId,string swapContractAddress,string walletAddress))))',
    'function getTokens()',
    'function setTokens(array(string tokenContractAddress))',
  ],
  [ProtocolIds.RequestForQuoteERC20]: [
    'function getSignerSideOrderERC20(string chainId,string swapContractAddress,string senderAmount,string signerToken,string senderToken,string senderWallet,string minExpiry,string proxyingFor)',
    'function getSenderSideOrderERC20(string chainId,string swapContractAddress,string signerAmount,string signerToken,string senderToken,string senderWallet,string minExpiry,string proxyingFor)',
    'function getPricingERC20(array((string baseToken,string quoteToken)),string minExpiry)',
    'function getAllPricingERC20(string minExpiry)',
  ],
  [ProtocolIds.LastLookERC20]: [
    'function subscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function subscribeAllPricingERC20()',
    'function unsubscribePricingERC20(array((string baseToken,string quoteToken)))',
    'function unsubscribeAllPricingERC20()',
    'function setPricingERC20(array(string baseToken,string quoteToken,string minimum,array(array((string level,string price))),array(array((string level,string price)))))',
    'function considerOrderERC20(string chainId,string swapContractAddress,string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s)',
  ],
  [ProtocolIds.IndexingERC20]: [
    'function addOrderERC20((string chainId,string swapContractAddress,string nonce,string expiry,string signerWallet,string signerToken,string signerAmount,string senderToken,string senderAmount,string v,string r,string s),bytes[] tags)',
    'function getOrdersERC20((string chainId,string signerWallet,string signerToken,string senderWallet,string senderToken,bytes[] tags),string offset,string limit,string by,string direction)',
  ],
  [ProtocolIds.Indexing]: [
    'function addOrder((string chainId,string swapContractAddress,uint256 nonce,uint256 expiry,uint256 protocolFee,(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),(address wallet,address token,bytes4 kind,uint256 id,uint256 amount),address affiliateWallet,uint256 affiliateAmount),bytes[] tags)',
    'function getOrders((string chainId,string signerWallet,string signerToken,string signerId,string senderWallet,string senderToken,bytes[] tags),string offset,string limit,string by,string direction)',
  ],
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
