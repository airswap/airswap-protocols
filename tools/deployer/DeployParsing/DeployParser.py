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
    'TransferHandlerRegistry': '',
    'Validator': '../../../source/validator/deploys.json',
    'Wrapper': '../../../source/wrapper/deploys.json'
}


def parse(file_input):
    migration_components = []

    with open(file_input) as data:
        for line in data:
            cleaned_line = line.rstrip()
            if line[:MIGRATION_SUB_IDX] == "MIGRATION_STATUS:":
                migration_components.append(cleaned_line[MIGRATION_SUB_IDX:])
            else:
                print(cleaned_line)

    for component in migration_components:
        json_obj = json.loads(component)
        if json_obj['status'] == 'preMigrate':
            network = json_obj['data']['network']
            print("Network: " + network + ", " + CHAIN_ID[network])
        elif json_obj['status'] == 'deployed':
            contract_name = json_obj['data']['contract']['contractName']
            contract_address = json_obj['data']['contract']['address']
            print(contract_name + ": " + contract_address)


    with open(CONTRACT_DIR['Wrapper']) as data:
        for line in data:
            print(line)


if __name__ == "__main__":
    parse("input.txt")
