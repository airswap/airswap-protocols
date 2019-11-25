from pathlib import Path
import pprint
import json

DEV_DEP = "devDependencies"
DEP = "dependencies"
SEARCH_DIR = ['./source', './utils']

if __name__ == "__main__":

    dependency_graph = {}
    pp = pprint.PrettyPrinter(indent=2)

    # go through all package files and extract their dependencies
    for directory in SEARCH_DIR:
        for filename in Path(directory).rglob('package.json'):
            #ignore node_modules
            if "node_modules" in str(filename):
                continue

            # prepend to make searching easier
            key = "@airswap/" + str(filename).split('/')[1]

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
        package_dependencies = package[1]
        for dependency in package_dependencies[DEP].items():

            declared_dep = dependency[0]
            declared_ver = dependency[1]

            # skip if we don't see the packages we care about
            if 'airswap' not in declared_dep and 'test-utils' not in declared_dep and 'order-utils' not in declared_dep:
                continue

            # check version against declared version
            expected_version = dependency_graph[declared_dep]['version']
            declared_version = declared_ver
            if declared_version != expected_version:
                print("'%s' version mismatch for %s. Is %s, but should be %s" % (package[0], declared_dep, declared_version, expected_version))
            print("'%s' version for %s matches: %s" % (package[0], declared_dep, expected_version))

