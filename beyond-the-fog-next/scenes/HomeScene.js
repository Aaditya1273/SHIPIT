import Phaser from "phaser";
import { startNewGame, getConversation } from "@/lib/api";
// WS_BASE_URL reads from env — never falls back to localhost in production
export const WS_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002';
import { GAME_ITEMS_ABI, CONTRACT_ADDRESSES, STAKING_MANAGER_ABI } from '@/lib/contracts';
import { ethers } from 'ethers';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: "HomeScene" });
    this.player = null;
    this.playerLight = null;
    this.cursors = null;
    this.wasd = null;
    this.walkableGrid = [];
    this.occupiedGrid = [];
    this.tileSize = 32;
    this.villagers = null;
    this.nearbyVillager = null;
    this.enterKey = null;
    this.interactionText = null;
    this.gameData = null;
    this.resetKey = null;
    this.resetTimer = null;
    this.initialPlayerPos = { x: 1, y: 4.5 };
    this.resetFeedbackText = null;
    this.account = null;
    this.playerInventory = new Map();
    this.mintKey = null;
    this.activeMintZone = null;
    this.mintText = null;
    this.startTime = 0;
    this.guessCount = 0;
    this.guessMade = false;
    this.nftCount = 0;
    this.tokenBalanceElement = null;
    this.currentBalance = 0;
    this.playerAccountId = null;
    this.wrongLocationChosen = false;
    this.timeLimit = null;
    this.movingVillagers = null;
    this.movingVillagerPaths = []; 
    this.inftTokenId = null;
    this.inftManager = null;
    this.worldBuilder = null;
    this.npcManager = null;
    this.gameState = 'INITIALIZING'; // FSM State
  }

  init(data) {
    if (data && data.existingGameData) {
      this.gameData = data.existingGameData;
      console.log("Existing game data loaded:", this.gameData);
    }
    this.account = data ? data.account : null;
    this.difficulty = data ? data.difficulty || "Easy" : "Easy";
    this.isStaking = data ? data.isStaking || false : false;
    this.timeLimit = data ? data.timeLimit : null;
    this.roomId = data ? data.roomId : null;
    this.remotePlayers = new Map();
    this.ws = null;
  }
  createTokenBalanceUI() {
    this.tokenBalanceElement = document.createElement('div');
    this.tokenBalanceElement.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #fbbf24;
        border-radius: 15px;
        padding: 15px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        z-index: 1000;
        min-width: 200px;
        font-family: 'Inter', sans-serif;
        backdrop-filter: blur(10px);
    `;
    
    this.tokenBalanceElement.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span id="balance-text" style="color: #fbbf24; line-height: 1.5; font-family: 'Inter', sans-serif;">[C] - Choose Location<br>[I] - Inventory</span>
        </div>
    `;
    
    document.body.appendChild(this.tokenBalanceElement);

    // --- A1 POLISH: RESIZE HANDLER ---
    this.scale.on('resize', this.handleResize, this);
}

handleResize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    if (this.player) {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }
}

  setupMultiplayer() {
    if (!this.roomId || !this.account) return;
    
    const wsUrl = `${WS_BASE_URL.replace('http', 'ws')}/ws/${this.roomId}/${this.account}`;
    console.log(`Connecting to multiplayer: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMultiplayerMessage(data);
      } catch (e) {
        console.error("WS Parse Error:", e);
      }
    };

    this.ws.onopen = () => console.log("Connected to multiplayer room:", this.roomId);
    this.ws.onclose = () => console.log("Disconnected from multiplayer");
    this.ws.onerror = (err) => console.error("WS Error:", err);
  }

  handleMultiplayerMessage(data) {
    switch (data.type) {
      case 'remote_move':
        this.updateRemotePlayer(data.playerId, data.pos, data.anim);
        break;
      case 'player_left':
        const rp = this.remotePlayers.get(data.playerId);
        if (rp) {
          rp.sprite.destroy();
          rp.label.destroy();
          this.remotePlayers.delete(data.playerId);
        }
        break;
      case 'chat_message':
        console.log(`Chat from ${data.playerId}: ${data.message}`);
        if (this.player && this.inftGuide) {
            this.inftGuide.x = this.player.x + 40;
            this.inftGuide.y = this.player.y - 40;
        }
        break;
    }
  }

  updateRemotePlayer(id, pos, anim) {
    let rp = this.remotePlayers.get(id);
    if (!rp) {
      const sprite = this.add.sprite(pos.x, pos.y, 'player').setDisplaySize(32, 32).setDepth(25);
      const label = this.add.text(pos.x, pos.y - 20, id.substring(0, 6), {
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(26);
      
      rp = { sprite, label };
      this.remotePlayers.set(id, rp);
    }

    rp.sprite.setPosition(pos.x, pos.y);
    rp.label.setPosition(pos.x, pos.y - 20);
    if (anim && rp.sprite.anims) {
        rp.sprite.play(anim, true);
    }
  }

  async create() {
    this.scene.bringToTop("UIScene");
    this.scene.bringToTop("InventoryScene");
    this.startTime = this.time.now;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0)
      .setDepth(200);

    const panelWidth = 600;
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const loadingPanel = this.add.graphics().setDepth(201);

    loadingPanel.fillStyle(0x1a1a2e, 0.95);
    loadingPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    loadingPanel.lineStyle(4, 0xd4af37, 1);
    loadingPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    loadingPanel.lineStyle(2, 0xffd700, 0.6);
    loadingPanel.strokeRoundedRect(
      panelX + 2,
      panelY + 2,
      panelWidth - 4,
      panelHeight - 4,
      23
    );

    const gameTitle = this.add
      .text(width / 2, panelY + 60, "Beyond-The-Fog", {
        fontFamily: "Inter, sans-serif",
        fontSize: "36px",
        color: "#d4af37",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const loadingSubtitle = this.add
      .text(width / 2, panelY + 100, "Creating a New Mystery...", {
        fontFamily: "Inter, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const progressBarWidth = 450;
    const progressBarHeight = 25;
    const progressBarX = width / 2 - progressBarWidth / 2;
    const progressBarY = panelY + 160;

    const progressBox = this.add.graphics().setDepth(202);
    progressBox.fillStyle(0x2c2c54, 0.8);
    progressBox.fillRoundedRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      12
    );
    progressBox.lineStyle(2, 0x666699, 1);
    progressBox.strokeRoundedRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      12
    );

    const progressBar = this.add.graphics().setDepth(203);

    const percentText = this.add
      .text(width / 2, progressBarY + progressBarHeight / 2, "0%", {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(204);

    const statusText = this.add
      .text(width / 2, panelY + 220, "Initializing...", {
        fontFamily: "Inter, sans-serif",
        fontSize: "18px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(202);

    const loadingDots = this.add
      .text(width / 2, panelY + 250, "", {
        fontFamily: "Inter, sans-serif",
        fontSize: "24px",
        color: "#d4af37",
      })
      .setOrigin(0.5)
      .setDepth(202);

    let dotCount = 0;
    const dotsTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        loadingDots.setText(".".repeat(dotCount));
      },
      loop: true,
    });

    let progress = 0;
    const progressTimer = this.time.addEvent({
      delay: 50,
      callback: () => {
        progress += 0.005;
        if (progress > 1) progress = 1;

        progressBar.clear();

        progressBar.fillGradientStyle(
          0x4caf50,
          0x2e7d32,
          0x81c784,
          0x66bb6a,
          1
        );
        const padding = 3;
        const progressWidth = (progressBarWidth - padding * 2) * progress;
        progressBar.fillRoundedRect(
          progressBarX + padding,
          progressBarY + padding,
          progressWidth,
          progressBarHeight - padding * 2,
          10
        );

        if (progress > 0.1) {
          progressBar.fillStyle(0xffffff, 0.3);
          progressBar.fillRoundedRect(
            progressBarX + padding,
            progressBarY + padding + 2,
            progressWidth,
            4,
            2
          );
        }

        percentText.setText(Math.floor(progress * 100) + "%");

        if (progress < 0.2) {
          statusText.setText("Connecting to server...");
        } else if (progress < 0.4) {
          statusText.setText("Generating mystery storyline...");
        } else if (progress < 0.6) {
          statusText.setText("Creating village layout...");
        } else if (progress < 0.8) {
          statusText.setText("Placing villagers and items...");
        } else if (progress < 0.95) {
          statusText.setText("Finalizing game world...");
        } else {
          statusText.setText("Almost ready...");
        }
      },
      loop: true,
    });

    console.log("diffulty - ", this.difficulty);

    statusText.setText("Fetching dialogue history from 0G Storage...");

    const gameData = await startNewGame(
      this.difficulty,
      this.account
    );

    progressTimer.destroy();
    dotsTimer.destroy();

    // Handle API failure gracefully — show error instead of crashing
    if (!gameData || !gameData.game_id) {
      const errorMsg = gameData?.error || "Server error. Please refresh and try again.";
      statusText.setText(`⚠ ${errorMsg}`);
      loadingDots.setText("✗").setStyle({ color: "#e74c3c", fontSize: "32px" });
      percentText.setText("Error");
      console.error("startNewGame failed:", errorMsg, gameData?.details);
      // Re-enable keyboard so player can navigate away
      this.input.keyboard.enabled = true;
      return;
    }

    const { game_id, inaccessible_locations, villagers } = gameData;

    progress = 1;
    progressBar.clear();
    progressBar.fillGradientStyle(0x4caf50, 0x2e7d32, 0x81c784, 0x66bb6a, 1);
    const padding = 3;
    const progressWidth = (progressBarWidth - padding * 2) * progress;
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding,
      progressWidth,
      progressBarHeight - padding * 2,
      10
    );

    progressBar.fillStyle(0xffffff, 0.3);
    progressBar.fillRoundedRect(
      progressBarX + padding,
      progressBarY + padding + 2,
      progressWidth,
      4,
      2
    );

    percentText.setText("100%");
    statusText.setText("Complete!");
    loadingDots.setText("✓");
    loadingDots.setStyle({ color: "#4CAF50", fontSize: "32px" });

    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: [
          overlay,
          loadingPanel,
          gameTitle,
          loadingSubtitle,
          progressBox,
          progressBar,
          percentText,
          statusText,
          loadingDots,
        ],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          loadingPanel.destroy();
          gameTitle.destroy();
          loadingSubtitle.destroy();
          progressBox.destroy();
          progressBar.destroy();
          percentText.destroy();
          statusText.destroy();
          loadingDots.destroy();
        },
      });
    });

    if (!game_id) {
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          "Error: Could not start a new game.\nPlease check the server and refresh.",
          { fontSize: "24px", fill: "#ff0000", align: "center" }
        )
        .setOrigin(0.5);
      return;
    }
    this.gameData = { game_id, inaccessible_locations, villagers };
    console.log("Game data initialized:", this.gameData);

    this.events.on("villagerUnlocked", this.unlockVillager, this);

    if (this.scene.get("ItemLockScene")) {
      this.scene
        .get("ItemLockScene")
        .events.on("villagerUnlocked", this.unlockVillager, this);
    }

    if (this.account) {
      await this.updateInventory();
    }

    this.lights.enable().setAmbientColor(0x555555);

    try {
      if (!this.sound.get("background_music") || !this.sound.get("background_music").isPlaying) {
        this.sound.play("background_music", { loop: true, volume: 0.2 });
      }
    } catch (e) {
      console.warn("Background music failed to start:", e.message);
    }

    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene", {
        account: this.account,
        inaccessibleLocations: this.gameData.inaccessible_locations,
        difficulty: this.difficulty,
      });
    }

    // --- MODULAR WORLD BUILDING ---
    const { WorldBuilder } = require('@/lib/game/WorldBuilder');
    const { NPCManager } = require('@/lib/game/NPCManager');
    
    this.worldBuilder = new WorldBuilder(this);
    this.npcManager = new NPCManager(this);

    // Global light manager
    this.lights.enable();
    this.lights.setAmbientColor(0x333333);

    // Build the world using WorldBuilder
    this.worldBuilder.buildWorld(this.game.config.width * 2, this.game.config.height * 2);

    // Initialize iNFT Guide sprite (Ethereal companion)
    this.inftGuide = this.add.sprite(0, 0, 'villager01')
        .setAlpha(0) // Hidden until born
        .setScale(0.8)
        .setDepth(1001);
    
    if (this.inftGuide.setPipeline) this.inftGuide.setPipeline("Light2D");

    // Floating animation for guide
    this.tweens.add({
        targets: this.inftGuide,
        y: "-=10",
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    // Spawn NPCs using modular component
    const ALL_POSSIBLE_ITEMS = ["FISHING_ROD", "AXE", "SHOVEL", "LANTERN", "PICKAXE", "HAMMER", "BUCKET", "SCYTHE"];
    const currentGameItems = Phaser.Utils.Array.Shuffle([...ALL_POSSIBLE_ITEMS]).slice(0, 4);
    this.npcManager.spawnVillagers(this.gameData, currentGameItems);

    this.createPlayer(1, 4.5);

    // --- A1 POLISH: CINEMATIC CAMERA ---
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.5); // Start zoomed out for dramatic effect

    this.setupMultiplayer();

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.7,
      duration: 3000,
      ease: 'Cubic.easeInOut'
    });

    const worldWidth = Math.ceil(this.cameras.main.width / this.tileSize) * this.tileSize;
    const worldHeight = Math.floor(this.cameras.main.height / this.tileSize) * this.tileSize;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,S,A,D");

    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.interactionText = this.add
      .text(0, 0, "Press ENTER to talk", {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.mintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.chooseLocationKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.mintText = this.add
      .text(0, 0, "Press M to mint", {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.events.on("resume", () => {
      if (this.input && this.input.keyboard) {
        this.input.keyboard.enabled = true;
      }
      // Reset conversation guard so player can talk again after dialogue closes
      this._conversationInProgress = false;
    });

    const ALL_MINT_ZONES = {
      FISHING_ROD: { x: 6, y: 10, width: 80, height: 80 },
      AXE: { x: 35.5, y: 15, width: 80, height: 80 },
      SHOVEL: { x: 23, y: 9, width: 80, height: 80 },
      LANTERN: { x: 28, y: 6, width: 80, height: 80 },
      PICKAXE: { x: 33, y: 16.5, width: 80, height: 80 },
      HAMMER: { x: 37, y: 4, width: 80, height: 80 },
      BUCKET: { x: 21, y: 13, width: 80, height: 80 },
      SCYTHE: { x: 40.5, y: 4, width: 80, height: 80 },
    };

    currentGameItems.forEach((itemName) => {
      const zoneData = ALL_MINT_ZONES[itemName];
      if (zoneData) {
        this.createMintingZone(
          zoneData.x * this.tileSize,
          zoneData.y * this.tileSize,
          zoneData.width,
          zoneData.height,
          itemName
        );
      }
    });

    this.setupResetPlayer();
  }

  isWalkableAt(worldX, worldY) {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    if (this.walkableGrid[tileY] && this.walkableGrid[tileY][tileX]) {
      return true;
    }
    return false;
  }

  createBuilding(tileX, tileY, texture, tileWidth = 4, tileHeight = 4) {
    const pixelX = tileX * this.tileSize;
    const pixelY = tileY * this.tileSize;
    this.add
      .image(pixelX, pixelY, texture)
      .setOrigin(0)
      .setDisplaySize(tileWidth * this.tileSize, tileHeight * this.tileSize);
    for (let y = Math.floor(tileY); y < Math.floor(tileY + tileHeight); y++) {
      for (let x = Math.floor(tileX); x < Math.floor(tileX + tileWidth); x++) {
        if (this.walkableGrid[y]) {
          this.walkableGrid[y][x] = false;
        }
        if (this.occupiedGrid[y]) {
          this.occupiedGrid[y][x] = true;
        }
      }
    }
  }

  createObstacle(tileX, tileY, texture, tileWidth, tileHeight) {
    const isForest = texture === "forest01" || texture === "forest02";
    const tileSize = this.tileSize;

    const effectiveTileWidth = isForest ? tileWidth * 6 : tileWidth;
    const effectiveTileHeight = isForest ? tileHeight * 6 : tileHeight;

    const obstacle = this.add
      .image(tileX * tileSize, tileY * tileSize, texture)
      .setOrigin(0)
      .setDisplaySize(
        effectiveTileWidth * tileSize,
        effectiveTileHeight * tileSize
      );

    if (obstacle.setPipeline) obstacle.setPipeline("Light2D");

    for (
      let y = Math.floor(tileY);
      y < Math.floor(tileY + effectiveTileHeight);
      y++
    ) {
      for (
        let x = Math.floor(tileX);
        x < Math.floor(tileX + effectiveTileWidth);
        x++
      ) {
        if (this.occupiedGrid[y]) {
          this.occupiedGrid[y][x] = true;
        }
      }
    }
  }

  createLake(tileX, tileY, texture, tileWidth = 10, tileHeight = 10) {
    this.createObstacle(tileX, tileY, texture, tileWidth, tileHeight);
  }

  createVillager(tileX, tileY, texture, scaleSize, id, requiredItem = null) {
    const villager = this.villagers.create(
      tileX * this.tileSize + 16,
      tileY * this.tileSize + 16,
      texture
    );
    villager
      .setOrigin(0.5)
      .setDisplaySize(32, 32)
      .setScale(scaleSize);
    
    if (villager.setPipeline) villager.setPipeline("Light2D");

    villager.name = id;
    villager.requiredItem = requiredItem;

    if (requiredItem) {
      const lockIcon = this.add
        .text(villager.x, villager.y - 25, "🔒", {
          fontSize: "18px",
        })
        .setOrigin(0.5)
        .setDepth(31);
      villager.lockIcon = lockIcon;
      lockIcon.setVisible(!this.playerInventory.has(requiredItem));
    } else {
      villager.lockIcon = null;
    }
  }

  createPlayer(tileX, tileY) {
    const pixelX = tileX * this.tileSize + this.tileSize / 2;
    const pixelY = tileY * this.tileSize + this.tileSize / 2;
    this.initialPlayerPos = { x: pixelX, y: pixelY };

    this.player = this.physics.add
      .sprite(pixelX, pixelY, `player_${this.playerGender.toLowerCase()}_down`)
      .setOrigin(0.5)
      .setDisplaySize(this.tileSize, this.tileSize)
      .setScale(0.08);
      
    if (this.player.setPipeline) this.player.setPipeline("Light2D");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.player.currentDirection = "down";
    this.player.lastDirection = "down";

    this.playerLight = this.lights
      .addLight(pixelX, pixelY, 300)
      .setColor(0xaaccff)
      .setIntensity(1.2);

    const worldWidth =
      Math.ceil(this.cameras.main.width / this.tileSize) * this.tileSize;
    const worldHeight =
      Math.floor(this.cameras.main.height / this.tileSize) * this.tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  setupResetPlayer() {
    this.resetKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );

    this.resetFeedbackText = this.add
      .text(this.cameras.main.centerX, 50, "", {
        fontFamily: "Inter, sans-serif",
        fontSize: "20px",
        color: "#d4af37",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.resetKey.on("down", () => {
      this.resetFeedbackText
        .setText("Hold [R] for 1.5s to reset position...")
        .setVisible(true);
      this.resetTimer = this.time.delayedCall(1500, () => {
        this.player.setPosition(
          this.initialPlayerPos.x,
          this.initialPlayerPos.y
        );
        this.resetFeedbackText.setText("Position has been reset!");
        this.time.delayedCall(1000, () => {
          this.resetFeedbackText.setVisible(false);
        });
      });
    });

    this.resetKey.on("up", () => {
      if (this.resetTimer && this.resetTimer.getProgress() < 1) {
        this.resetTimer.remove(false);
        this.resetFeedbackText.setVisible(false);
      }
    });
  }

  handleInteraction() {
    let closestVillager = null;
    let minDistance = 50;

    this.villagers.getChildren().forEach((villager) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        villager.x,
        villager.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestVillager = villager;
      }
    });

    this.nearbyVillager = closestVillager;

    if (this.nearbyVillager) {
      if (
        this.nearbyVillager.requiredItem &&
        !this.playerInventory.has(this.nearbyVillager.requiredItem)
      ) {
        const itemName = this.nearbyVillager.requiredItem.replace(/_/g, " ");
        this.interactionText.setText(`Requires: ${itemName}`);
      } else {
        this.interactionText.setText("Press ENTER to talk");
      }
      this.interactionText.setVisible(true);
      this.interactionText.setPosition(
        this.nearbyVillager.x,
        this.nearbyVillager.y - this.nearbyVillager.displayHeight / 2
      );
    } else {
      this.interactionText.setVisible(false);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
      if (this.nearbyVillager.requiredItem) {
        this.scene.pause();
        this.scene.launch("ItemLockScene", {
          villager: this.nearbyVillager,
          account: this.account,
          gameData: this.gameData,
        });
        return;
      }
      this.initiateConversation(this.nearbyVillager);
    }
  }

  // Track dialogues when interacting with villagers
async initiateConversation(villager) {
    // Guard against double-launch
    if (this._conversationInProgress) return;
    this._conversationInProgress = true;

    this.input.keyboard.enabled = false;
    this.player.setVelocity(0, 0);
    this.interactionText.setText("...");
    // Defensive audio play to prevent AbortError on rapid pause
    const playSafe = (key, config) => {
      try {
        const sound = this.sound.add(key, config);
        sound.play();
      } catch (err) {
        console.warn(`Audio play interrupted for ${key}:`, err.message);
      }
    };

    playSafe("villager_accept", { volume: 6 });

    const conversationData = await getConversation(villager.name, "Hello", this.account);

    this.input.keyboard.enabled = true;
    this.interactionText.setText("Press ENTER to talk");

    if (conversationData && conversationData.npc_dialogue) {
      // Pause current scene but allow audio to transition
      this.scene.pause();
      this.scene.launch("DialogueScene", {
        conversationData: conversationData,
        newGameData: this.gameData,
        villagerSpriteKey: villager.texture.key,
        playerId: this.account,
        callingScene: 'HomeScene'
      });
    } else {
      console.error("Could not fetch conversation for villager:", villager.name);
      this._conversationInProgress = false;
    }
  }

  // Pass dialogue history when game ends
  handleGameEnd(winnerId) {
    const dialogueScene = this.scene.get("DialogueScene");
    const dialogueHistory = dialogueScene ? dialogueScene.getDialogueHistory() : [];
    
    this.scene.start("EndScene", {
      dialogueHistory: dialogueHistory,
      // ... other data ...
    });
  }

  createMovingVillagers() {
    // Define 4 different patrol routes on walkable paths
    const movingVillagerData = [
      {
        // Villager 1: Patrols the main horizontal path
        path: [
          { x: 3 * this.tileSize, y: 5 * this.tileSize },
          { x: 15 * this.tileSize, y: 5 * this.tileSize },
          { x: 25 * this.tileSize, y: 5 * this.tileSize },
          { x: 15 * this.tileSize, y: 5 * this.tileSize }
        ],
        texture: "villager02",
        scale: 0.06,
        speed: 30
      },
      {
        // Villager 2: Patrols around the upper area
        path: [
          { x: 9 * this.tileSize, y: 2 * this.tileSize },
          { x: 12 * this.tileSize, y: 2 * this.tileSize },
          { x: 12 * this.tileSize, y: 4 * this.tileSize },
          { x: 9 * this.tileSize, y: 4 * this.tileSize }
        ],
        texture: "villager02",
        scale: 0.065,
        speed: 25
      },
      {
        // Villager 3: Patrols the vertical path on the right
        path: [
          { x: 16 * this.tileSize, y: 6 * this.tileSize },
          { x: 16 * this.tileSize, y: 12 * this.tileSize },
          { x: 16 * this.tileSize, y: 18 * this.tileSize },
          { x: 16 * this.tileSize, y: 12 * this.tileSize }
        ],
        texture: "villager03",
        scale: 0.07,
        speed: 35
      },
      {
        // Villager 4: Patrols the lower horizontal area
        path: [
          { x: 2 * this.tileSize, y: 11 * this.tileSize },
          { x: 8 * this.tileSize, y: 11 * this.tileSize },
          { x: 14 * this.tileSize, y: 11 * this.tileSize },
          { x: 8 * this.tileSize, y: 11 * this.tileSize }
        ],
        texture: "villager04",
        scale: 0.068,
        speed: 28
      }
    ];

    movingVillagerData.forEach((data, index) => {
      this.createMovingVillager(data.path, data.texture, data.scale, data.speed, index);
    });
  }

  createMovingVillager(path, texture, scale, speed, index) {
    // Create the villager sprite at the first path point
    const villager = this.movingVillagers.create(path[0].x, path[0].y, texture);
    
    villager
      .setOrigin(0.5)
      .setDisplaySize(32, 32)
      .setScale(scale)
      .setDepth(5); // Lower depth than player to appear behind
    
    if (villager.setPipeline) villager.setPipeline("Light2D");

    // Store path and movement data
    villager.patrolPath = path;
    villager.currentPathIndex = 0;
    villager.moveSpeed = speed;
    villager.isMoving = false;
    villager.movingVillagerIndex = index;
    
    // Start movement
    this.moveVillagerToNextPoint(villager);
  }

  moveVillagerToNextPoint(villager) {
    if (!villager || !villager.patrolPath) return;

    const currentPoint = villager.patrolPath[villager.currentPathIndex];
    const nextIndex = (villager.currentPathIndex + 1) % villager.patrolPath.length;
    const nextPoint = villager.patrolPath[nextIndex];

    // Calculate distance and time for smooth movement
    const distance = Phaser.Math.Distance.Between(
      currentPoint.x, currentPoint.y,
      nextPoint.x, nextPoint.y
    );
    const duration = (distance / villager.moveSpeed) * 1000;

    villager.isMoving = true;

    // Create tween for smooth movement
    this.tweens.add({
      targets: villager,
      x: nextPoint.x,
      y: nextPoint.y,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        villager.currentPathIndex = nextIndex;
        villager.isMoving = false;
        
        // Wait a bit before moving to next point
        this.time.delayedCall(
          Phaser.Math.Between(1000, 3000), // Random pause between 1-3 seconds
          () => {
            this.moveVillagerToNextPoint(villager);
          }
        );
      }
    });
  }

  async update() {
    if (!this.player) return;
    
    // Add stuck detection
    const currentPos = { x: this.player.x, y: this.player.y };

    
    if (this.activeMintZone) {
      const playerBounds = this.player.getBounds();
      const zoneBounds = this.activeMintZone.getBounds();
      if (
        !Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zoneBounds)
      ) {
        this.mintText.setVisible(false);
        this.activeMintZone = null;
      } else {
        this.mintText.setPosition(this.player.x, this.player.y - 30);
        this.mintText.setVisible(true);
        this.updateMintZoneText(this.activeMintZone.itemName);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.mintKey) && this.activeMintZone) {
      if (!this.playerInventory.has(this.activeMintZone.itemName)) {
        this.mintItem(this.activeMintZone.itemName);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.scene.launch("InventoryScene", { account: this.account });
      this.scene.pause();
    }

    if (Phaser.Input.Keyboard.JustDown(this.chooseLocationKey)) {
      this.scene.launch("UIScene", {
        account: this.account,
        inaccessibleLocations: this.gameData.inaccessible_locations,
        difficulty: this.difficulty,
      });
      this.scene.bringToTop("UIScene");
    }

    if (this.playerLight) {
      this.playerLight.x = this.player.x;
      this.playerLight.y = this.player.y;
    }

    const speed = 110;
    let velocityX = 0;
    let velocityY = 0;
    let newDirection = this.player.currentDirection;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed;
      newDirection = "left";
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed;
      newDirection = "right";
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed;
      newDirection = "up";
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed;
      newDirection = "down";
    }

    if (velocityX !== 0 && velocityY !== 0) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        if (
          (this.cursors.up.isDown || this.wasd.W.isDown) &&
          this.player.lastDirection !== "up"
        ) {
          newDirection = "left";
        } else if (
          (this.cursors.down.isDown || this.wasd.S.isDown) &&
          this.player.lastDirection !== "down"
        ) {
          newDirection = "left";
        }
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        if (
          (this.cursors.up.isDown || this.wasd.W.isDown) &&
          this.player.lastDirection !== "up"
        ) {
          newDirection = "right";
        } else if (
          (this.cursors.down.isDown || this.wasd.S.isDown) &&
          this.player.lastDirection !== "down"
        ) {
          newDirection = "right";
        }
      }

      const magnitude = Math.sqrt(
        velocityX * velocityX + velocityY * velocityY
      );
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    if (newDirection !== this.player.currentDirection) {
      this.player.setTexture(`player_${newDirection}`);
      this.player.lastDirection = this.player.currentDirection;
      this.player.currentDirection = newDirection;
    }

    const delta = this.game.loop.delta / 1000;
    const nextX = this.player.x + velocityX * delta;
    const nextY = this.player.y + velocityY * delta;
    if (velocityX !== 0 || velocityY !== 0) {
      if (this.isWalkableAt(nextX, nextY)) {
        this.player.setVelocity(velocityX, velocityY);
        // record actual movement time only when we set a non-zero velocity
        this.lastMoveTime = this.time.now;
      } else {
        this.player.setVelocity(0, 0);
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    // update lastPlayerPos for the next frame (now that velocity vars exist)
    this.lastPlayerPos = currentPos;

    this.villagers.getChildren().forEach((villager) => {
      if (villager.lockIcon) {
        villager.lockIcon.setPosition(villager.x, villager.y - 25);
        villager.lockIcon.setVisible(!!villager.requiredItem);
      }
    });

    this.nearbyVillager = null;
    this.villagers.getChildren().forEach((villager) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        villager.x,
        villager.y
      );
      if (distance < 50) {
        this.nearbyVillager = villager;
      }
    });

    if (this.nearbyVillager) {
      if (this.nearbyVillager.requiredItem) {
        const itemName = this.nearbyVillager.requiredItem.replace(/_/g, ' ');
        if (this.playerInventory.has(this.nearbyVillager.requiredItem)) {
          this.interactionText.setText(`Press ENTER to use ${itemName}`);
        } else {
          this.interactionText.setText(`Requires: ${itemName}`);
        }
      } else {
        this.interactionText.setText("Press ENTER to talk");
      }
      this.interactionText.setVisible(true);
      this.interactionText.setPosition(
        this.nearbyVillager.x,
        this.nearbyVillager.y - 40
      );
    } else {
      this.interactionText.setVisible(false);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.nearbyVillager) {
      this.startConversation();
    }

    // Handle moving villagers interaction detection (but don't allow interaction)
    if (this.movingVillagers) {
      this.movingVillagers.getChildren().forEach((movingVillager) => {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          movingVillager.x,
          movingVillager.y
        );
        
        // If player gets too close, show a brief message that they can't interact
        if (distance < 40 && !movingVillager.showingMessage) {
          movingVillager.showingMessage = true;
          
          const noInteractText = this.add
            .text(movingVillager.x, movingVillager.y - 40, "Busy walking...", {
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              color: "#cccccc",
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: { x: 4, y: 2 },
            })
            .setOrigin(0.5)
            .setDepth(32);

          // Remove the text after a short time
          this.time.delayedCall(1500, () => {
            noInteractText.destroy();
            movingVillager.showingMessage = false;
          });
        }
      });
    }

    // --- MULTIPLAYER SYNC ---
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const moveData = {
            type: 'player_move',
            pos: { x: this.player.x, y: this.player.y },
            anim: this.player.anims.currentAnim ? this.player.anims.currentAnim.key : null
        };
        this.ws.send(JSON.stringify(moveData));
    }
  }

  startConversation() {
    if (!this.nearbyVillager) return;
    // Guard against double-launch
    if (this._conversationInProgress) return;

    if (this.nearbyVillager.requiredItem) {
      this.scene.pause();
      this.scene.launch('ItemLockScene', {
        villager: this.nearbyVillager,
        account: this.account,
        gameData: this.gameData,
        callingScene: 'HomeScene'
      });
      return;
    }

    console.log(`Starting conversation with villager: ${this.nearbyVillager.name}`);
    this._conversationInProgress = true;
    this.input.keyboard.enabled = false;
    this.player.setVelocity(0, 0);

    getConversation(this.nearbyVillager.name, "I'd like to talk.", this.account)
      .then(conversationData => {
        if (conversationData && conversationData.npc_dialogue) {
          // pause BEFORE launch so DialogueScene gets valid data
          this.scene.pause();
          this.scene.launch("DialogueScene", {
            conversationData: conversationData,
            villagerSpriteKey: this.nearbyVillager.texture.key,
            newGameData: this.gameData,
            playerId: this.account,
            callingScene: 'HomeScene'
          });
        } else {
          console.error("Invalid conversation data:", conversationData);
          this.showErrorMessage("Unable to start conversation. Please try again.");
          this.input.keyboard.enabled = true;
          this._conversationInProgress = false;
        }
      })
      .catch(error => {
        console.error("Error getting conversation:", error);
        this.showErrorMessage("Network error. Please try again.");
        this.input.keyboard.enabled = true;
        this._conversationInProgress = false;
      });
  }

  /**
   * Finalizes a staked game on the smart contract to transfer bonuses.
   * This should be called from the EndScene when the game is won.
   * NOTE: The connected account must be the owner of the StakingManager contract.
   * @param {number} elapsedTime The total time taken to finish the game in seconds.
   */
  async finalizeStakedGame(elapsedTime) {
    if (!this.isStaking) {
      console.log("Not a staking game, no finalization needed.");
      return;
    }
    if (!this.account) {
      console.error("Wallet not connected, cannot finalize game.");
      return;
    }

    console.log(`Finalizing staked game. Time: ${elapsedTime}s`);
    const statusText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      "Finalizing game on-chain...",
      { fontSize: "24px", color: "#2ecc71", backgroundColor: "rgba(0,0,0,0.8)", padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setDepth(5000).setScrollFactor(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.stakingManager, STAKING_MANAGER_ABI, signer);

      statusText.setText("Please confirm in wallet...");
      // The contract requires the owner to settle the game.
      const tx = await stakingContract.settleSinglePlayerGame(this.account, Math.round(elapsedTime));

      statusText.setText("Settling game... Waiting for confirmation...");
      await tx.wait();

      statusText.setText("Game settled! Rewards are on their way.");
    } catch (error) {
      console.error("Failed to settle game:", error);
      statusText.setText("Error settling game. See console.");
    } finally {
      this.time.delayedCall(4000, () => statusText.destroy());
    }
  }

  async mintItem(itemName) {
    if (!this.account) {
      console.error("Wallet not connected, cannot mint.");
      return;
    }

    if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask or a compatible wallet is not installed.");
        this.showErrorMessage("Please install a wallet like MetaMask.");
        return;
    }

    this.input.keyboard.enabled = false;
    const mintingStatusText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        `Minting ${itemName}...`,
        {
          fontSize: "24px",
          color: "#d4af37",
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: { x: 20, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setDepth(101);

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const gameItemsContract = new ethers.Contract(CONTRACT_ADDRESSES.gameItems, GAME_ITEMS_ABI, signer);

        const itemNameFormatted = itemName.replace(/_/g, ' ');
        // Use 0G Storage CID from env if available, otherwise fall back to storagescan URL
        const itemCidEnvKey = `NEXT_PUBLIC_ITEM_${itemName.toUpperCase()}_CID`;
        const itemCid = process.env[itemCidEnvKey] || null;
        const tokenURI = itemCid
          ? `0g://${itemCid}`
          : `https://storagescan-newton.0g.ai/file/${itemName.toLowerCase()}`; 
        const description = `A trusty ${itemNameFormatted} for your adventures.`;

        mintingStatusText.setText("Please confirm in wallet...");

        const tx = await gameItemsContract.mintItemTo(
            this.account,
            tokenURI,
            itemNameFormatted,
            description
        );

        mintingStatusText.setText("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log("Mint successful! Transaction:", receipt.hash);
        
        let tokenId = null;
        const transferEvent = receipt.logs
            .map(log => {
                try {
                    return gameItemsContract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find(event => 
                event && 
                event.name === 'Transfer' && 
                event.args.to.toLowerCase() === this.account.toLowerCase()
            );

        if (transferEvent) {
            tokenId = transferEvent.args.tokenId.toString();
            console.log(`Parsed tokenId: ${tokenId} for item: ${itemName}`);
            mintingStatusText.setText(`${itemNameFormatted} minted successfully!`);
            
            this.playerInventory.set(itemName, tokenId);
            this.events.emit('inventoryUpdated'); // Notify scenes that inventory has changed
        } else {
            console.error("Could not find a valid 'Transfer' event to parse the tokenId.");
            mintingStatusText.setText(`Minted, but item verification failed.`);
        }
        
        if (this.activeMintZone && this.activeMintZone.itemName === itemName) {
            this.updateMintZoneText(itemName);
        }

    } catch (error) {
        console.error("Minting failed:", error);
        let errorMessage = "Minting failed. See console.";
        if (error.code === 'ACTION_REJECTED') {
            errorMessage = "Transaction rejected.";
        } else if (error.reason) {
            errorMessage = `Minting failed: ${error.reason}`;
        }
        mintingStatusText.setText(errorMessage);
    } finally {
        this.time.delayedCall(3000, () => {
            mintingStatusText.destroy();
            this.input.keyboard.enabled = true;
        });
    }
  }

  /**
   * Handles the 0.01 ETH penalty for an incorrect guess in a staked game.
   * This function should be called from another scene (e.g., UIScene) when a player guesses incorrectly.
   * @returns {Promise<boolean>} True if the penalty was paid successfully, otherwise false.
   */
  async payGuessPenalty() {
    if (!this.isStaking && !this.wrongLocationChosen) {
      console.log("No penalty required.");
      return true;
    }
    if (!this.account) {
      this.showErrorMessage("Wallet not connected.");
      return false;
    }

    this.input.keyboard.enabled = false;
    const statusText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      "Submitting 0.01 0G penalty...",
      { fontSize: "24px", color: "#d4af37", backgroundColor: "rgba(0,0,0,0.8)", padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setDepth(101).setScrollFactor(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.stakingManager, STAKING_MANAGER_ABI, signer);

      statusText.setText("Please confirm in wallet...");
      const penaltyAmount = ethers.parseEther("0.001");
      
      const tx = await stakingContract.depositFundsForHint({ value: penaltyAmount });

      statusText.setText("Transaction sent. Waiting...");
      await tx.wait();

      statusText.setText("Penalty paid successfully!");
      return true;
    } catch (error) {
      console.error("Penalty payment failed:", error);
      let errorMessage = "Penalty payment failed.";
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction rejected.";
      }
      statusText.setText(errorMessage);
      return false;
    } finally {
      this.time.delayedCall(3000, () => {
        statusText.destroy();
        this.input.keyboard.enabled = true;
      });
    }
  }

  unlockVillager(villagerName) {
    const villager = this.villagers
      .getChildren()
      .find((v) => v.name === villagerName);
    if (villager) {
      console.log(`Unlocking villager: ${villagerName}`);
      villager.requiredItem = null;
      this.events.emit('inventoryUpdated'); // Notify scenes that inventory has changed
    }
  }

  createMintingZone(x, y, width, height, itemName) {
    const zone = this.add.zone(x, y, width, height).setOrigin(0);
    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.moves = false;
    zone.itemName = itemName;

    this.physics.add.overlap(this.player, zone, () => {
      this.activeMintZone = zone;
      console.log(`Creating mint zone for ${itemName} at (${x}, ${y})`);
      this.mintText.setStyle({ color: "#ffff00" });
      this.updateMintZoneText(itemName);
    });
  }

  updateMintZoneText(itemName) {
    if (this.playerInventory.has(itemName)) {
      this.mintText.setText(
        `You already own the ${itemName.replace(/_/g, " ")}`
      );
      this.mintText.setStyle({ color: "#888888" });
    } else {
      this.mintText.setText(`Press M to mint ${itemName.replace(/_/g, " ")}`);
      this.mintText.setStyle({ color: "#ffff00" });
    }
  }
  async updateInventory() {
    if (!this.account || typeof window.ethereum === 'undefined') {
        console.log("Wallet not connected, skipping inventory update.");
        return;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const gameItemsContract = new ethers.Contract(CONTRACT_ADDRESSES.gameItems, GAME_ITEMS_ABI, provider);

        const transferToFilter = gameItemsContract.filters.Transfer(null, this.account);
        const transferFromFilter = gameItemsContract.filters.Transfer(this.account, null);

        const transferToEvents = await gameItemsContract.queryFilter(transferToFilter, 0, 'latest');
        const transferFromEvents = await gameItemsContract.queryFilter(transferFromFilter, 0, 'latest');

        const ownedTokenIds = new Map();

        for (const event of transferToEvents) {
            const tokenId = event.args.tokenId.toString();
            ownedTokenIds.set(tokenId, true);
        }

        for (const event of transferFromEvents) {
            const tokenId = event.args.tokenId.toString();
            ownedTokenIds.set(tokenId, false);
        }

        this.playerInventory.clear();

        for (const [tokenId, isOwned] of ownedTokenIds.entries()) {
            if (isOwned) {
                try {
                    const [name] = await gameItemsContract.getItem(tokenId);
                    const itemName = name.replace(/ /g, '_').toUpperCase();
                    this.playerInventory.set(itemName, tokenId);
                } catch (e) {
                    console.warn(`Could not fetch details for token ID ${tokenId}. It might have been traded in.`, e);
                }
            }
        }

        console.log("Player inventory updated from blockchain:", Array.from(this.playerInventory.entries()));

    } catch (error) {
        console.error("Failed to update inventory from blockchain:", error);
        this.showErrorMessage("Could not load your items.");
    }
  }

  handleVillagerInteraction(villagerSprite) {
    const villagerId = villagerSprite.getData("villagerId");
    console.log(`Interacting with villager: ${villagerId}`);
    
    getConversation(villagerId, "I'd like to talk.").then(conversationData => {
      console.log("Raw conversation response:", conversationData);
      
      if (conversationData && conversationData.npc_dialogue) {
        console.log("Conversation data received:", conversationData);
        
        this.scene.launch("DialogueScene", {
          conversationData: conversationData,
          villagerSpriteKey: villagerSprite.texture.key,
          newGameData: this.newGameData
        });
        this.scene.pause();
      } else {
        console.error("Failed to get conversation data or missing npc_dialogue:", conversationData);
        const errorText = this.add.text(
          this.cameras.main.centerX, 
          this.cameras.main.centerY, 
          "Unable to start conversation. Please try again.", 
          { fontSize: '24px', color: '#ff4444' }
        ).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
          errorText.destroy();
        });
      }
    }).catch(error => {
      console.error("Error getting conversation:", error);
      const errorText = this.add.text(
        this.cameras.main.centerX, 
        this.cameras.main.centerY, 
        "Network error. Please try again.", 
        { fontSize: '24px', color: '#ff4444' }
      ).setOrigin(0.5);
      
      this.time.delayedCall(2000, () => {
        errorText.destroy();
      });
    });
  }
  shutdown() {
    if (this.tokenBalanceElement && this.tokenBalanceElement.parentNode) {
        this.tokenBalanceElement.parentNode.removeChild(this.tokenBalanceElement);
    }
  }

  async initializeGameINFT() {
    try {
        console.log('🎮 Initializing Game INFT...');
        console.log('🔑 Account:', this.account);
        console.log('🎯 Difficulty:', this.difficulty);

        if (!this.account) {
            console.error('❌ No account available for INFT creation');
            return;
        }

        // Get player's keypair (in production, derive from wallet)
        console.log('🔐 Generating player keypair...');
        const playerKeypair = await this.generatePlayerKeypair();
        console.log('✅ Keypair generated:', {
            publicKey: playerKeypair.publicKey.substring(0, 20) + '...',
            hasSecretKey: !!playerKeypair.secretKey
        });

        console.log('📡 Making INFT creation request...');
        const response = await fetch(`${WS_BASE_URL.replace('ws', 'http')}/inft/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: this.account,
                gameMode: 'single_player',
                difficulty: this.difficulty,
                ownerPublicKey: playerKeypair.publicKey // Send public key
            })
        });

        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('🎉 INFT creation response:', result);
            
            this.inftTokenId = result.tokenId;
            this.playerPublicKey = playerKeypair.publicKey;
            this.playerSecretKey = playerKeypair.secretKey; // Store locally (in-memory only)
            
            console.log(`✅ Game INFT #${this.inftTokenId} created`);
            this.showINFTNotification('Your Narrative INFT has been born! It will evolve as you play.');
        } else {
            const errorText = await response.text();
            console.error('❌ INFT creation failed:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ Failed to initialize Game INFT:', error);
    }
}

async generatePlayerKeypair() {
    // In production, derive from wallet's signature or use a secure enclave
    // For now, generate and store locally
    if (this.playerKeypair) return this.playerKeypair;

    const response = await fetch(`${WS_BASE_URL.replace('ws', 'http')}/crypto/generate-keypair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerAddress: this.account
        })
    });

    if (response.ok) {
        const keypair = await response.json();
        this.playerKeypair = keypair;
        return keypair;
    }

    throw new Error('Failed to generate keypair');
}

async updateINFTProgress() {
    if (!this.inftTokenId || !this.account || !this.playerPublicKey) return;

    try {
        const gameProgressData = {
            tokenId: this.inftTokenId,
            playerAddress: this.account,
            villagerInteractions: this.getVillagerInteractionCount(),
            itemsCollected: this.playerInventory.size,
            collectedItemNames: Array.from(this.playerInventory.keys()),
            penaltiesPaid: this.calculatePenaltiesPaid(),
            currentScore: this.calculateCurrentScore(),
            progressPercentage: this.calculateGameProgress(),
            version: this.gameProgressVersion || 1,
            playDurationSeconds: Math.floor((Date.now() - this.gameStartTime) / 1000)
        };

        const response = await fetch(`${WS_BASE_URL.replace('ws', 'http')}/inft/evolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenId: this.inftTokenId,
                gameProgressData,
                ownerPublicKey: this.playerPublicKey // Send public key for re-encryption
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`🌱 INFT evolved to stage: ${result.newStage}`);

            if (result.newStage !== 'newborn') {
                this.showINFTNotification(`Your Guide has evolved to ${result.newStage}!`);
            }

            this.gameProgressVersion = (this.gameProgressVersion || 1) + 1;
        }
    } catch (error) {
        console.error('❌ Failed to update INFT progress:', error);
    }
}
    showINFTNotification(message) {
        console.log(`[iNFT] ${message}`);
        
        const width = this.cameras.main.width;
        const notification = this.add.container(width / 2, -100);
        notification.setScrollFactor(0).setDepth(2000);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.lineStyle(2, 0xd4af37, 1);
        bg.fillRoundedRect(-250, 0, 500, 80, 15);
        bg.strokeRoundedRect(-250, 0, 500, 80, 15);
        
        const text = this.add.text(0, 40, message, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 450 }
        }).setOrigin(0.5);

        notification.add([bg, text]);

        this.tweens.add({
            targets: notification,
            y: 100,
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.time.delayedCall(4000, () => {
                    this.tweens.add({
                        targets: notification,
                        y: -100,
                        duration: 500,
                        ease: 'Back.in',
                        onComplete: () => notification.destroy()
                    });
                });
            }
        });
    }

    updateINFTVisuals(stage) {
        const stageKeys = {
            newborn: 'villager01',
            curious: 'villager02',
            master:  'villager03',
            wise:    'villager04',
            savior:  'player'
        };

        const newKey = stageKeys[stage] || 'villager01';
        
        if (this.inftGuide) {
            this.inftGuide.setTexture(newKey);
            this.inftGuide.setAlpha(0.8);
            
            // Spawn particles
            const particles = this.add.particles(this.inftGuide.x, this.inftGuide.y, 'flower01', {
                speed: 100,
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.5, end: 0 },
                lifespan: 1000,
                quantity: 20
            });
            this.time.delayedCall(1000, () => particles.destroy());
        }
    }
}
