from pathlib import Path
import json
import sys
import os

class bcolors:
    FAIL = '\033[91m'
    ENDC = '\033[0m'

DEV_DEP = "devDependencies"
DEP = "dependencies"
SEARCH_DIR = ['/source', '/tools']
PACKAGE_TYPES = [ 'airswap', 'test-utils', 'order-utils' ]

class DependencyChecker:

    def __init__(self):
        self.dependency_graph = {}

    def generate_graph(self):
        # go through all package files and extract their dependencies
        for directory in SEARCH_DIR:
            for filename in Path(os.getcwd() + directory).rglob('package.json'):
                #ignore node_modules
                if "node_modules" in str(filename):
                    continue

                with open(str(filename)) as f:
                    data = json.load(f)

                    # extract metadata
                    package_name = data['name']
                    self.dependency_graph[package_name] = {}
                    self.dependency_graph[package_name]['version'] = data['version']

                    # set up the dependencies
                    if DEV_DEP in data:
                        self.dependency_graph[package_name][DEV_DEP] = data[DEV_DEP]
                    if DEP in data:
                        self.dependency_graph[package_name][DEP] = data[DEP]

    def identify_violations(self):

        # flag to determine if return is 0 or 1
        stable = True

        # go through every package looking for where the dependency doesn't match the dependency graph
        for package in self.dependency_graph.items():
            package_name = package[0]
            package_dependencies = package[1]
            package_version = self.dependency_graph[package_name]['version']

            print("%s %s" % (package_name, package_version))

            for dep_type in [DEP, DEV_DEP]:

                # if the package doesn't use a dependency type skip over it
                if dep_type not in package_dependencies:
                    continue

                # go through all the declared depdendencies in a package
                for declared_dep in package_dependencies[dep_type].items():
                    declared_name = declared_dep[0]
                    declared_ver = declared_dep[1]

                    # skip if we don't see the packages we care about
                    if not self.contains_packages(declared_name):
                        continue

                    # check version against declared version
                    expected_version = self.dependency_graph[declared_name]['version']
                    declared_version = declared_ver
                    if declared_version != expected_version:
                        stable = False
                        print(" - %s %s -> %s %s Version Mismatch %s" % (declared_name, declared_version, expected_version, bcolors.FAIL, bcolors.ENDC))
                    else:
                        print(" - %s -> %s" % (declared_name, expected_version))
            print()
        return stable

    def contains_packages(self, dep):
        for package_type in PACKAGE_TYPES:
            if package_type in dep:
                return True
        return False


if __name__ == "__main__":
    checker = DependencyChecker()
    checker.generate_graph()
    stable = checker.identify_violations()
    if not stable:
        sys.exit(1)

