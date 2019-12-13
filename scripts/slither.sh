#!/bin/bash
# ------------------------------------------------------------------
# Slither Runner
# Runs slither across sub-repos assigned in the below array
#
# To use:
# Create a Python 3.6 virtualenv "virtualenv --python=python3.6 venv"
# Activate the virtualenv "source venv/bin/activate"
# Install slither "pip install slither-analyzer"
# From root directory run "./scripts/slither.sh"
# Location of --solc may change dependent on local system
# Run which solc and copy to path if different
# ------------------------------------------------------------------


 array=( indexer delegate swap types wrapper )

 for package in "${array[@]}"
   do
    echo "source/${package}/contracts"
    slither --solc-remaps "openzeppelin-solidity/contracts=node_modules/openzeppelin-solidity/contracts @airswap=source @gnosis=node_modules/@gnosis" --solc /usr/bin/solc --exclude-low "source/${package}/contracts/"
   done
