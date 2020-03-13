from pathlib import Path
from collections import defaultdict
import json
import sys
import os
import argparse

class bcolors:
    BOLD = '\033[1m'
    FAIL = '\033[91m'
    UPDATED = '\033[32m'
    ENDC = '\033[0m'

DEV_DEP = "devDependencies"
DEP = "dependencies"
SEARCH_DIR = ['/source', '/tools']
DEPENDENCY_KEYWORD = 'airswap'

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

                filename_str = str(filename)
                with open(filename_str) as f:
                    data = json.load(f)

                    # extract metadata
                    package_name = data['name']
                    self.dependency_graph[package_name] = {}
                    self.dependency_graph[package_name]['version'] = data['version']
                    self.dependency_graph[package_name]['file_path'] = filename_str

                    # set up the dependencies
                    if DEV_DEP in data:
                        self.dependency_graph[package_name][DEV_DEP] = data[DEV_DEP]
                    if DEP in data:
                        self.dependency_graph[package_name][DEP] = data[DEP]

    def identify_violations(self, fix):
        is_stable = True
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
                    if DEPENDENCY_KEYWORD not in declared_name:
                        continue

                    # check version against declared version
                    expected_version = self.dependency_graph[declared_name]['version']
                    if declared_version != expected_version:
                        is_stable = False
                        if fix:
                            self.dependency_graph[package_name][dep_type][declared_name] = expected_version
                            print("%s%s%s (%s): %s@%s →%s Updated to %s %s" %
                                  (bcolors.BOLD, package_name, bcolors.ENDC, dep_type, declared_name, declared_version, bcolors.UPDATED, expected_version, bcolors.ENDC))
                        else:
                            print("%s%s%s (%s): %s@%s →%s Update to %s %s" %
                                  (bcolors.BOLD, package_name, bcolors.ENDC, dep_type, declared_name, declared_version, bcolors.FAIL, expected_version, bcolors.ENDC))
        print()
        return is_stable

    def write_fixes(self):
        # go through the package.jsons and write the updated dependencies
        for package in self.dependency_graph.keys():
            filename = self.dependency_graph[package]['file_path']
            with open(str(filename), 'r+') as f:
                # read old data
                data = json.load(f)
                # update data
                package_name = data['name']
                if DEV_DEP in data:
                    data[DEV_DEP] = self.dependency_graph[package_name][DEV_DEP]
                if DEP in data:
                    data[DEP] = self.dependency_graph[package_name][DEP]
                # write new data
                f.seek(0)
                f.write(json.dumps(data, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix",
                        action='store_true',
                        help="automatically fix dependency version mismatch")
    args = parser.parse_args()

    checker = DependencyChecker()
    checker.generate_graph()
    stable = checker.identify_violations(args.fix)
    if not stable and args.fix:
        # fix violations, return 0
        checker.write_fixes()
    elif not stable:
        # ignore violations, return 1
        print("To fix run with '--fix'")
        print()
        sys.exit(1)

