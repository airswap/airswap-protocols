import json

MIGRATION_SUB_IDX = 17
CHAIN_ID = {
    'development': '-1',
    'mainnet': '1',
    'rinkeby': '4',
    'goerli': '5',
    'kovan': '42',
}
CONTRACT_DIR = {
    'Types': '../../../source/types/deploys.json',
    'DelegateFactory': '../../../source/delegate/deploys.json',
    'Indexer': '../../../source/indexer/deploys.json',
    'Swap': '../../../source/swap/deploys.json',
    'TransferHandlerRegistry': '../../../source/swap/deploys.json',
    'Validator': '../../../source/validator/deploys.json',
    'Wrapper': '../../../source/wrapper/deploys.json'
}


def parse(file_input):
    # separate the migration json and regular output
    migration_components = []
    with open(file_input) as data:
        for line in data:
            cleaned_line = line.rstrip()
            if line[:MIGRATION_SUB_IDX] == "MIGRATION_STATUS:":
                migration_components.append(cleaned_line[MIGRATION_SUB_IDX:])
            else:
                print(cleaned_line)

    # collect all the new deploy information
    network = "development"
    deploy_data = {}
    for component in migration_components:
        json_obj = json.loads(component)
        # collect network
        if json_obj['status'] == 'preMigrate':
            network = json_obj['data']['network']
            deploy_data[network] = CHAIN_ID[network]
        # collect new address for contract on network
        elif json_obj['status'] == 'deployed':
            contract_name = json_obj['data']['contract']['contractName']
            contract_address = json_obj['data']['contract']['address']
            deploy_data[contract_name] = contract_address

    # go through all deploys.json and update them
    for contract_name, deploy_file in CONTRACT_DIR.items():
        with open(deploy_file, "r+") as data:
            lines = data.readlines()
            string = '\n'.join(lines)
            json_obj = json.loads(string)
            json_obj[CHAIN_ID[network]] = deploy_data[contract_name]
            # jump to beginning of file and write
            data.seek(0)
            data.write(json.dumps(json_obj, indent=2))


if __name__ == "__main__":
    parse("input.txt")
