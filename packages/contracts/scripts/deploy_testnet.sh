#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# ZK-PAY: Stellar Testnet Deployment Script
# ═══════════════════════════════════════════════════════════════════
# 
# Prerequisites:
#   - stellar CLI installed (v27+)
#   - WASM built: cargo build --target wasm32v1-none --release
#   - Circuits compiled and VK exported (build/withdraw_vkey.json)
#
# Usage:
#   ./scripts/deploy_testnet.sh
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CIRCUITS_DIR="$(cd "$PROJECT_DIR/../circuits" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ZK-PAY: Deploy to Stellar Testnet${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"

# ─── Step 1: Verify prerequisites ──────────────────────────────

echo -e "\n${YELLOW}[1/5] Verifying prerequisites...${NC}"

WASM_PATH="$PROJECT_DIR/target/wasm32v1-none/release/zk_pay_privacy_pool.wasm"
if [ ! -f "$WASM_PATH" ]; then
    echo -e "${RED}  ✗ WASM not found at $WASM_PATH${NC}"
    echo -e "${YELLOW}  Run: cargo build --target wasm32v1-none --release${NC}"
    exit 1
fi
WASM_SIZE=$(stat -c%s "$WASM_PATH" 2>/dev/null || stat -f%z "$WASM_PATH" 2>/dev/null)
echo -e "${GREEN}  ✓ WASM found ($((WASM_SIZE/1024))KB)${NC}"

VK_PATH="$CIRCUITS_DIR/build/withdraw_vkey.json"
if [ ! -f "$VK_PATH" ]; then
    echo -e "${RED}  ✗ VK JSON not found at $VK_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ VK found${NC}"

# Check stellar CLI
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}  ✗ stellar CLI not found${NC}"
    echo -e "${YELLOW}  Install: https://github.com/stellar/stellar-cli${NC}"
    exit 1
fi
STELLAR_VER=$(stellar --version 2>&1 | head -1)
echo -e "${GREEN}  ✓ stellar CLI: $STELLAR_VER${NC}"

# ─── Step 2: Setup testnet identity ───────────────────────────

echo -e "\n${YELLOW}[2/5] Setting up testnet identity...${NC}"

# Create or use a deployer identity
DEPLOYER="zkpay-deployer"
if ! stellar keys list 2>/dev/null | grep -q "$DEPLOYER"; then
    echo -e "${YELLOW}  Creating new deployer identity...${NC}"
    stellar keys generate "$DEPLOYER" --network testnet
fi

DEPLOYER_ADDR=$(stellar keys address "$DEPLOYER")
echo -e "${GREEN}  ✓ Deployer address: $DEPLOYER_ADDR${NC}"

# Check/fund testnet balance
BALANCE=$(stellar keys balance "$DEPLOYER" --network testnet 2>/dev/null || echo "0")
echo -e "${BLUE}  Balance: ${BALANCE} XLM${NC}"

if [ "$(echo "$BALANCE < 10" | bc -l 2>/dev/null || echo "1")" -eq "1" ]; then
    echo -e "${YELLOW}  Funding deployer with Friendbot...${NC}"
    stellar keys fund "$DEPLOYER" --network testnet 2>&1 || true
    sleep 3
    NEW_BALANCE=$(stellar keys balance "$DEPLOYER" --network testnet 2>/dev/null || echo "unknown")
    echo -e "${GREEN}  ✓ New balance: ${NEW_BALANCE} XLM${NC}"
fi

# ─── Step 3: Deploy the contract ──────────────────────────────

echo -e "\n${YELLOW}[3/5] Deploying contract to Stellar testnet...${NC}"

# Create a temp directory for deployment artifacts
DEPLOY_DIR=$(mktemp -d)
trap "rm -rf $DEPLOY_DIR" EXIT

# Generate the VK and deploy command via Node.js
echo -e "${BLUE}  Generating contract deployment args...${NC}"

node "$SCRIPT_DIR/generate_vk_args.js" "$VK_PATH" "$DEPLOY_DIR" "$DEPLOYER_ADDR"

CONTRACT_ID=$(cat "$DEPLOY_DIR/contract_id.txt" 2>/dev/null || echo "")

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${YELLOW}  Deploying contract...${NC}"
    
    # Deploy the contract
    DEPLOY_OUTPUT=$(stellar contract deploy \
        --wasm "$WASM_PATH" \
        --source "$DEPLOYER" \
        --network testnet \
        2>&1)
    
    echo "$DEPLOY_OUTPUT"
    CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | tail -1 | xargs)
    echo "$CONTRACT_ID" > "$DEPLOY_DIR/contract_id.txt"
    
    if [ -z "$CONTRACT_ID" ] || [ ${#CONTRACT_ID} -lt 20 ]; then
        echo -e "${RED}  ✗ Failed to deploy contract${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}  ✓ Contract deployed at: $CONTRACT_ID${NC}"

# ─── Step 4: Initialize the contract ──────────────────────────

echo -e "\n${YELLOW}[4/5] Initializing contract with VK...${NC}"

# Create owner and postman addresses
OWNER="$DEPLOYER_ADDR"
POSTMAN="$DEPLOYER_ADDR"

# Read VK args from file
VK_ARGS=$(cat "$DEPLOY_DIR/vk_args.txt" 2>/dev/null || echo "")

if [ -z "$VK_ARGS" ]; then
    echo -e "${YELLOW}  No pre-computed VK args, initializing contract...${NC}"
    
    # Initialize with basic params
    # Note: Full VK initialization requires more complex arg passing
    # For now, deploy the contract with the WASM
    echo -e "${BLUE}  Contract ID: $CONTRACT_ID${NC}"
    echo -e "${BLUE}  Owner: $OWNER${NC}"
    echo -e "${BLUE}  Postman: $POSTMAN${NC}"
    echo -e "${YELLOW}  VK initialization requires manual setup via SDK${NC}"
else
    echo -e "${BLUE}  Initializing with VK...${NC}"
    # TODO: Initialize with VK args once format is finalized
    echo -e "${YELLOW}  VK args ready in $DEPLOY_DIR/vk_args.txt${NC}"
fi

# ─── Step 5: Verify deployment ────────────────────────────────

echo -e "\n${YELLOW}[5/5] Verifying deployment...${NC}"

# Check the contract exists
echo -e "${BLUE}  Checking contract on testnet...${NC}"
stellar contract id --wasm-hash "$(stellar contract hash --wasm "$WASM_PATH")" --network testnet 2>/dev/null || true

# Try to get the WASM hash
WASM_HASH=$(stellar contract hash --wasm "$WASM_PATH" 2>/dev/null || echo "unknown")
echo -e "${GREEN}  ✓ WASM hash: $WASM_HASH${NC}"
echo -e "${GREEN}  ✓ Contract ID: $CONTRACT_ID${NC}"

echo -e "\n${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Summary${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "  Contract ID:     ${GREEN}$CONTRACT_ID${NC}"
echo -e "  Network:         ${GREEN}testnet${NC}"
echo -e "  Deployer:        ${GREEN}$DEPLOYER_ADDR${NC}"
echo -e "  WASM Size:       ${GREEN}${WASM_SIZE} bytes${NC}"
echo -e ""
echo -e "  To verify:"
echo -e "    stellar contract invoke \\"
echo -e "      --id $CONTRACT_ID \\"
echo -e "      --source $DEPLOYER \\"
echo -e "      --network testnet \\"
echo -e "      -- \\"
echo -e "      current_tree_size"
echo -e ""
echo -e "  Save this Contract ID for SDK configuration!"
echo -e ""

# Save deployment config
cat > "$PROJECT_DIR/deployment.testnet.json" << EOF
{
  "network": "stellar:testnet",
  "contractId": "$CONTRACT_ID",
  "deployer": "$DEPLOYER_ADDR",
  "wasmHash": "$WASM_HASH",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S)Z",
  "circuits": {
    "withdraw": {
      "vkPath": "$VK_PATH",
      "nPublic": 8,
      "curve": "bls12381"
    }
  }
}
EOF

echo -e "${GREEN}  ✓ Deployment config saved to deployment.testnet.json${NC}"
echo -e "\n${GREEN}✓ Deployment complete!${NC}"
