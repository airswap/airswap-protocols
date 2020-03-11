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
    'Types': '',
    'DelegateFactory': '',
    'Indexer': '',
    'Swap': '',
    'TransferHandlerRegistry': '',
    'Validator': '',
    'Wrapper': ''
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


if __name__ == "__main__":
    parse("input.txt")
