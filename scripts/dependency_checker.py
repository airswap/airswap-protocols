from pathlib import Path
from collections import defaultdict
import json
import sys
import os
import argparse

class bcolors:
    BOLD = '\033[1m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

DEV_DEP = "devDependencies"
DEP = "dependencies"
SEARCH_DIR = ['/source', '/tools']
PACKAGE_TYPES = ['airswap', 'test-utils']

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

    def contains_packages(self, dep):
        for package_type in PACKAGE_TYPES:
            if package_type in dep:
                return True
        return False

    def identify_violations(self):
        violation_needed_version = defaultdict(lambda: defaultdict(defaultdict))
        print()

        # go through every package looking for where the dependency doesn't match the dependency graph
        for package_name, package_dependencies in self.dependency_graph.items():
            for dep_type in [DEP, DEV_DEP]:

                # if the package doesn't use a dependency type skip over it
                if dep_type not in package_dependencies:
                    continue

                # go through all the declared dependencies in a package
                for declared_name, declared_version in package_dependencies[dep_type].items():
                    # skip if we don't see the packages we care about
                    if not self.contains_packages(declared_name):
                        continue

                    # check version against declared version
                    expected_version = self.dependency_graph[declared_name]['version']
                    if declared_version != expected_version:
                        violation_needed_version[package_name][dep_type][declared_name] = expected_version
                        print("%s%s%s (%s): %s@%s →%s Update to %s %s" % (bcolors.BOLD, package_name, bcolors.ENDC, dep_type, declared_name, declared_version, bcolors.FAIL, expected_version, bcolors.ENDC))
        print()
        return violation_needed_version

    def write_fixes(self):
        for directory in SEARCH_DIR:
            for filename in Path(os.getcwd() + directory).rglob('package.json'):
                #ignore node_modules
                if "node_modules" in str(filename):
                    continue

                with open(str(filename)) as f:
                    data = json.load(f)



                    # # extract metadata
                    package_name = data['name']

                    # self.dependency_graph[package_name] = {}
                    # self.dependency_graph[package_name]['version'] = data['version']
                    #
                    # # set up the dependencies
                    # if DEV_DEP in data:
                    #     self.dependency_graph[package_name][DEV_DEP] = data[DEV_DEP]
                    # if DEP in data:
                    #     self.dependency_graph[package_name][DEP] = data[DEP]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix",
                        action='store_true',
                        help="automatically fix dependency version mismatch")
    args = parser.parse_args()

    checker = DependencyChecker()
    checker.generate_graph()
    violation_updates = checker.identify_violations()
    if not violation_updates and args.fix:
        checker.write_fixes()

    if not violation_updates:
        sys.exit(1)

