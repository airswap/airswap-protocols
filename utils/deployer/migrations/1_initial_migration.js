require('dotenv').config();
var assert = require('assert');
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC1155TransferHandler = artifacts.require('ERC1155TransferHandler')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const KittyCoreTransferHandler = artifacts.require('KittyCoreTransferHandler')
const Types = artifacts.require('Types');
const Swap = artifacts.require('Swap');
const Wrapper = artifacts.require('Wrapper');
const Indexer = artifacts.require('Indexer');
const Index = artifacts.require('Index');
const DelegateFactory = artifacts.require('DelegateFactory');
const PreSwapChecker = artifacts.require('PreSwapChecker');

const {
  ERC20_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  ERC1155_INTERFACE_ID,
} = require('@airswap/order-utils').constants

module.exports = async(deployer, network) => {

  network = network.toUpperCase()


  let STAKING_TOKEN_ADDRESS = process.env[network + "_STAKE"]
  let WETH_ADDRESS = process.env[network + "_WETH"]

  const CKITTY_KIND = '0x9a20483d'
  //Deploy Base Contracts
  await deployer.deploy(Types)
  const transferHandlerRegistryInstance = await deployer.deploy(TransferHandlerRegistry)
  // Deploy the transferHandlers referencesing the registry
  await deployer.deploy(ERC1155TransferHandler)
  await deployer.deploy(ERC721TransferHandler)
  await deployer.deploy(ERC20TransferHandler)
  await deployer.deploy(KittyCoreTransferHandler)
  // link Types to Swap prior to deploy
  await Swap.link("Types", Types.address)
  await deployer.deploy(Swap, TransferHandlerRegistry.address)
  await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  await deployer.deploy(DelegateFactory, Swap.address, Indexer.address, '0x0001')
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)

  await deployer.deploy(PreSwapChecker, WETH_ADDRESS)
  //Deploy Contract-Created Contracts that also need to be verified
  await deployer.deploy(Index)
  // add the linkage between the handlers to the registry within the migration script
  await transferHandlerRegistryInstance.addTransferHandler(CKITTY_KIND, KittyCoreTransferHandler.address)
  await transferHandlerRegistryInstance.addTransferHandler(ERC20_INTERFACE_ID, ERC20TransferHandler.address)
  await transferHandlerRegistryInstance.addTransferHandler(ERC721_INTERFACE_ID, ERC721TransferHandler.address)
  await transferHandlerRegistryInstance.addTransferHandler(ERC1155_INTERFACE_ID, ERC1155TransferHandler.address)
};