import json

class DeployParser:

    def parse(self, file_input):
        migration_components = []

        with open(file_input) as data:
            for line in data:
                cleaned_line = line.rstrip()
                if line[:17] == "MIGRATION_STATUS:":
                    migration_components.append(cleaned_line[17:])
                else:
                    print(cleaned_line)

        network = 'development'
        for component in migration_components:
            json_obj = json.loads(component)
            component_output = json.dumps(json_obj, indent=2)
            if json_obj['status'] == 'preMigrate':
                network = json_obj['data']['network']
                print("Network: " + network)
            elif json_obj['status'] == 'deployed':
                contract_name = json_obj['data']['contract']['contractName']
                contract_address = json_obj['data']['contract']['address']
                print(contract_name + ": " + contract_address)




if __name__ == "__main__":
    parser = DeployParser()
    parser.parse("input.txt")
