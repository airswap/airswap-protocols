#!/bin/bash

 array=( indexer index delegate delegate-factory swap types wrapper )

 for package in "${array[@]}"
   do
    echo "source/${package}/contracts"
    slither --solc-remaps "openzeppelin-solidity/contracts=node_modules/openzeppelin-solidity/contracts @airswap=source @gnosis=node_modules/@gnosis" --solc /usr/bin/solc --exclude-low "source/${package}/contracts/"
   done
