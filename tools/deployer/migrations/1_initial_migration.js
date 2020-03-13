require('dotenv').config()
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC1155TransferHandler = artifacts.require('ERC1155TransferHandler')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const KittyCoreTransferHandler = artifacts.require('KittyCoreTransferHandler')
const Types = artifacts.require('Types')
const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const Indexer = artifacts.require('Indexer')
const Index = artifacts.require('Index')
const DelegateFactory = artifacts.require('DelegateFactory')
const Delegate = artifacts.require('Delegate')
const Validator = artifacts.require('Validator')
const { ADDRESS_ZERO, tokenKinds, chainIds } = require('@airswap/constants')
const fs = require('fs')

DEPLOYS_JSON = {
  Types: '../../../source/types/deploys.json',
  DelegateFactory: '../../../source/delegate/deploys.json',
  Indexer: '../../../source/indexer/deploys.json',
  Swap: '../../../source/swap/deploys.json',
  TransferHandlerRegistry: '../../../source/swap/deploys.json',
  Validator: '../../../source/validator/deploys.json',
  Wrapper: '../../../source/wrapper/deploys.json',
}

async function updateDeployJsons(network, deploy_data) {
  for (let [contract_name, file_path] of Object.entries(DEPLOYS_JSON)) {
    // go through all deploys json and update them
    address_json = require(file_path)
    address_json[chainIds[network]] = deploy_data[contract_name]
    address_json_string = JSON.stringify(address_json, null, '  ')
    fs.writeFileSync(__dirname + '/' + file_path, address_json_string, err => {
      if (err) throw err
    })
  }
}

module.exports = async (deployer, network) => {
  network = network.toUpperCase()

  let STAKING_TOKEN_ADDRESS = process.env[network + '_STAKE']
  let WETH_ADDRESS = process.env[network + '_WETH']

  //Deploy Base Contracts
  await deployer.deploy(Types)
  const transferHandlerRegistryInstance = await deployer.deploy(
    TransferHandlerRegistry
  )

  // Deploy the transferHandlers referencesing the registry
  await deployer.deploy(ERC1155TransferHandler)
  await deployer.deploy(ERC721TransferHandler)
  await deployer.deploy(ERC20TransferHandler)
  await deployer.deploy(KittyCoreTransferHandler)

  // add the linkage between the handlers to the registry within the migration script
  await transferHandlerRegistryInstance.addTransferHandler(
    tokenKinds.CKITTY,
    KittyCoreTransferHandler.address
  )
  await transferHandlerRegistryInstance.addTransferHandler(
    tokenKinds.ERC20,
    ERC20TransferHandler.address
  )
  await transferHandlerRegistryInstance.addTransferHandler(
    tokenKinds.ERC721,
    ERC721TransferHandler.address
  )
  await transferHandlerRegistryInstance.addTransferHandler(
    tokenKinds.ERC1155,
    ERC1155TransferHandler.address
  )

  // link Types to Swap prior to deploy
  await Swap.link('Types', Types.address)
  await deployer.deploy(Swap, TransferHandlerRegistry.address)
  const indexerInstance = await deployer.deploy(Indexer, STAKING_TOKEN_ADDRESS)
  const delegateFactoryInstance = await deployer.deploy(
    DelegateFactory,
    Swap.address,
    Indexer.address,
    '0x0001'
  )
  await deployer.deploy(Wrapper, Swap.address, WETH_ADDRESS)

  // link Types to Swap prior to deploy
  await Validator.link('Types', Types.address)
  await deployer.deploy(Validator, WETH_ADDRESS)

  if (network !== 'DEVELOPMENT') {
    //Deploy Factory-Created Contracts that also need to be verified
    await deployer.deploy(Index)
    await deployer.deploy(
      Delegate,
      Swap.address,
      Indexer.address,
      ADDRESS_ZERO,
      ADDRESS_ZERO,
      '0x0001'
    )

    //Update Jsons
    let deploy_data = {}
    deploy_data['Types'] = Types.address
    deploy_data['TransferHandlerRegistry'] = TransferHandlerRegistry.address
    deploy_data['Swap'] = Swap.address
    deploy_data['Indexer'] = Indexer.address
    deploy_data['DelegateFactory'] = DelegateFactory.address
    deploy_data['Wrapper'] = Wrapper.address
    deploy_data['Validator'] = Validator.address
    await updateDeployJsons(network, deploy_data)
  }
}
