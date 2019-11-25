from pathlib import Path
import pprint
import json

DEV_DEP = "devDependencies"
DEP = "dependencies"

if __name__ == "__main__":

    dependency_graph = {}
    pp = pprint.PrettyPrinter(indent=2)

    # go through all package files and extract their dependencies
    for filename in Path('./source').rglob('package.json'):
        if "node_modules" in str(filename):
            continue

        key = str(filename).split('/')[1]

        with open(filename) as f:
            data = json.load(f)
            dependency_graph[key] = {}

            dependency_graph[key]['version'] = data['version']

            if DEV_DEP in data.keys():
                dependency_graph[key][DEV_DEP] = data[DEV_DEP]

            if DEP in data.keys():
                dependency_graph[key][DEP] = data[DEP]

    # go through every package looking for where the dependency doesn't match the dependency graph
    for package in dependency_graph.items():
        for dependency in package[1][DEP].items():
            if 'airswap' not in dependency[0]:
                continue
            dependency_name = dependency[0].split('/')[1]

            # check version against declared version
            expected_version = dependency_graph[dependency_name]['version']
            declared_version = dependency[1]
            if declared_version != expected_version:
                print("'%s' version mismatch for %s. Is %s, but should be %s" % (package[0], dependency[0], declared_version, expected_version))
            print("'%s' version for %s matches: %s" % (package[0], dependency[0], expected_version))

