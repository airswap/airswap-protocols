#!/bin/bash

# AirSwap Client Generation Script
set -e

echo "🔄 Generating AirSwap Client"
echo "============================"
echo ""

# Clean previous build
echo "📋 Cleaning previous build..."
rm -rf ./build

# Temporarily comment out the export to avoid compilation errors
echo "🔧 Preparing for generation..."
sed -i.bak 's/export \* from/\/\/ export \* from/' index.ts

# Compile generator
echo "🔨 Compiling generator..."
yarn tsc

# Generate client files
echo "⚡ Generating client from OpenRPC specification..."
node build/src/generator.js

# Compile generated TypeScript
echo "🔨 Compiling generated client..."
yarn tsc -p tsconfig.generated.json

# Restore the export and compile main index
echo "🔨 Restoring exports and compiling main index..."
mv index.ts.bak index.ts
yarn tsc

echo ""
echo "✅ Client generation completed successfully!"
echo ""
echo "📁 Generated files available in build/ directory"
echo "📖 Ready to use: import { AirSwapClient } from '@airswap/client'"
echo ""
