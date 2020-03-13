from pathlib import Path
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

    def identify_and_fix_violations(self, fix):

        # flag to determine if return is 0 or 1
        is_stable = True
        print()

        # go through every package looking for where the dependency doesn't match the dependency graph
        for package in self.dependency_graph.items():
            package_name = package[0]
            package_dependencies = package[1]

            for dep_type in [DEP, DEV_DEP]:

                # if the package doesn't use a dependency type skip over it
                if dep_type not in package_dependencies:
                    continue

                # go through all the declared dependencies in a package
                for declared_name, declared_ver in package_dependencies[dep_type].items():
                    # skip if we don't see the packages we care about
                    if not self.contains_packages(declared_name):
                        continue

                    # check version against declared version
                    expected_version = self.dependency_graph[declared_name]['version']
                    declared_version = declared_ver
                    if declared_version != expected_version:
                        if fix:
                            package_dependencies[dep_type][declared_name] = expected_version
                        is_stable = False
                        print("%s%s%s (%s): %s@%s →%s Update to %s %s" % (bcolors.BOLD, package_name, bcolors.ENDC, dep_type, declared_name, declared_version, bcolors.FAIL, expected_version, bcolors.ENDC))
        print()
        return is_stable

    def contains_packages(self, dep):
        for package_type in PACKAGE_TYPES:
            if package_type in dep:
                return True
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix",
                        action='store_true',
                        help="automatically fix dependency version mismatch")
    args = parser.parse_args()

    checker = DependencyChecker()
    checker.generate_graph()
    stable = checker.identify_and_fix_violations(args.fix)
    if not stable and args.fix:
        # write the violations that have been fixed
        print('would have written')

    if not stable:
        sys.exit(1)

