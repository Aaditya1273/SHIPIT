import os
import json
import subprocess
import tempfile
import logging
import httpx
from web3 import Web3
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# 0G Newton Testnet Parameters
INDEXER_RPC = "https://indexer-storage-turbo.0g.ai"
EVM_RPC = "https://evmrpc-testnet.0g.ai"
USER_REGISTRY_ADDRESS = os.getenv("USER_REGISTRY_ADDRESS", "0x43195F579aE215d5A90A2811A379B6535f51C599")
FOGCOIN_ADDRESS = os.getenv("FOGCOIN_ADDRESS", "0xE2AF0A3F285Fe0EA78cE903b44c7FdCb851adF4a")
GAME_ITEMS_ADDRESS = os.getenv("GAME_ITEMS_ADDRESS", "0xA7973740D2F447833a69a5E28B708573C6f8f74F")

USER_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_rootHash", "type": "string"}],
        "name": "updateDialogueRoot",
        "outputs": [],
        "stateMutability": "external",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "latestDialogueRootHash",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "isUserRegistered",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]

GAME_ITEMS_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "bytes", "name": "data", "type": "bytes"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "external",
        "type": "function",
    }
]

FOGCOIN_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "external",
        "type": "function",
    }
]

class OGStorageService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(EVM_RPC))
        self.private_key = os.getenv("PRIVATE_KEY")
        if self.private_key:
            self.account = self.w3.eth.account.from_key(self.private_key)
            self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(USER_REGISTRY_ADDRESS), abi=USER_REGISTRY_ABI)
            self.fog_contract = self.w3.eth.contract(address=Web3.to_checksum_address(FOGCOIN_ADDRESS), abi=FOGCOIN_ABI)
            self.items_contract = self.w3.eth.contract(address=Web3.to_checksum_address(GAME_ITEMS_ADDRESS), abi=GAME_ITEMS_ABI)
        else:
            logger.warning("PRIVATE_KEY not set. On-chain anchoring disabled.")
            self.account = None
            self.contract = None
            self.fog_contract = None
            self.items_contract = None

    async def upload_data(self, data: Any) -> Optional[str]:
        """Upload data to 0G Storage via Node.js bridge"""
        if not self.private_key:
            logger.error("Cannot upload: PRIVATE_KEY missing")
            return None

        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as tf:
            json.dump(data, tf)
            temp_path = tf.name

        try:
            # Call Node.js bridge
            cmd = ["node", "bridge_0g.js", "upload", temp_path, self.private_key]
            process = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(__file__))
            
            if process.returncode != 0:
                logger.error(f"Bridge upload failed: {process.stderr}")
                return None

            result = json.loads(process.stdout)
            if not result.get("success"):
                logger.error(f"Bridge reported failure: {result.get('error')}")
                return None

            root_hash = result.get("rootHash")
            logger.info(f"✅ Uploaded to 0G Storage. Root: {root_hash}")
            return root_hash

        except Exception as e:
            logger.error(f"Error in upload_data: {e}")
            return None
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    async def anchor_root(self, root_hash: str) -> bool:
        """Anchor root hash on-chain in UserRegistry"""
        if not self.contract or not self.account:
            return False

        try:
            # Check if user is registered (address derived from PK)
            is_reg = self.contract.functions.isUserRegistered(self.account.address).call()
            if not is_reg:
                logger.info(f"User {self.account.address} not registered. Skipping anchor.")
                return False

            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.contract.functions.updateDialogueRoot(root_hash).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.status == 1:
                logger.info(f"✅ Anchored root on-chain. Tx: {tx_hash.hex()}")
                return True
            else:
                logger.error("Transaction failed")
                return False

        except Exception as e:
            logger.error(f"Error anchoring root: {e}")
            return False

    async def download_data(self, root_hash: str) -> Optional[Any]:
        """Download data from 0G Storage Indexer Gateway"""
        url = f"{INDEXER_RPC}/file?root={root_hash}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Download failed: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error downloading data: {e}")
            return None

    async def get_latest_dialogue(self, user_address: str) -> Optional[Any]:
        """Fetch latest dialogue from chain and storage"""
        if not self.contract:
            return None
            
        try:
            root_hash = self.contract.functions.latestDialogueRootHash(Web3.to_checksum_address(user_address)).call()
            if not root_hash or len(root_hash) < 10:
                return None
            
            return await self.download_data(root_hash)
        except Exception as e:
            logger.error(f"Error fetching latest dialogue: {e}")
            return None

    async def distribute_reward(self, user_address: str, amount: int) -> bool:
        """Mint FOG tokens to user as reward"""
        if not self.fog_contract or not self.account:
            return False

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.fog_contract.functions.mint(
                Web3.to_checksum_address(user_address), 
                amount
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 150000,
                'gasPrice': self.w3.eth.gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.status == 1:
                logger.info(f"💰 Reward distributed to {user_address}. Tx: {tx_hash.hex()}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error distributing reward: {e}")
            return False

    async def mint_game_item(self, user_address: str, item_id: int) -> bool:
        """Mint Game Item (ERC1155) to user"""
        if not self.items_contract or not self.account:
            return False

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.items_contract.functions.mint(
                Web3.to_checksum_address(user_address),
                item_id,
                1,
                b""
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            return receipt.status == 1
        except Exception as e:
            logger.error(f"Error minting item: {e}")
            return False
