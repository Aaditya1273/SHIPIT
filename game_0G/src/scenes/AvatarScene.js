import * as Phaser from "phaser";
import { ethers } from "ethers";
import { API_BASE_URL } from "../api";
import { NARRATIVE_INFT_ADDRESS, NARRATIVE_INFT_ABI } from "../contractConfig";

export class AvatarScene extends Phaser.Scene {
  constructor() {
    super({ key: "AvatarScene" });
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.selectedAvatarId = 1;
    this.previousSelectedBox = null;
    this.prevX = 0;
    this.prevY = 0;
    this.isMinting = false;
    this.claimButton = null;
  }

  init(data) {
    this.provider = data?.provider || null;
    this.signer = data?.signer || null;
    this.account = data?.account || null;
    console.log("[AvatarScene] Initialized. Account:", this.account, "Signer:", !!this.signer);
  }

  preload() {
    for (let i = 1; i <= 10; i++) {
      this.load.image(`mc_${i}`, `/assets/images/characters/mc_${i}.png`);
    }
    this.load.video('bg04_animated', '/assets/cut-scene/bg04_animated.mp4', 'loadeddata', false, true);
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const bgVideo = this.add.video(width / 2, height / 2, 'bg04_animated');
    const playVideo = () => {
      if (this.scene.isActive()) {
        bgVideo.play(true);
        if (bgVideo.video) {
          bgVideo.video.play().catch(err => {
            if (err.name !== 'AbortError') console.warn("Video play error:", err);
          });
        }
      }
    };

    if (this.sys.game.device.os.desktop) {
      playVideo();
    } else {
      this.input.once('pointerdown', playVideo);
      playVideo();
    }

    bgVideo.setScale(0.45).setScrollFactor(0).setOrigin(0.5);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0);
    this.showAvatarSelectionUI(width, height);
  }

  showAvatarSelectionUI(width, height) {
    const panelWidth = 1020;
    const panelHeight = 720;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x05050a, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
    panel.lineStyle(1.5, 0x2dd4bf, 0.6);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);

    // Subtle top accent line
    const accent = this.add.graphics();
    accent.lineStyle(2, 0x2dd4bf, 0.9);
    accent.lineBetween(panelX + 80, panelY + 1, panelX + panelWidth - 80, panelY + 1);

    // Title
    this.add.text(width / 2, panelY + 52, "CHOOSE YOUR IDENTITY", {
      fontFamily: "Cinzel, Georgia, serif",
      fontSize: "34px",
      color: "#ffffff",
      letterSpacing: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, panelY + 96, "YOUR AVATAR WILL BE ANCHORED AS AN iNFT ON THE 0G GALILEO TESTNET", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px",
      color: "#2dd4bf",
      letterSpacing: 3
    }).setOrigin(0.5);

    // Avatar grid
    const avatarSize = 112;
    const gridCenterX = width / 2;
    const gridStartY = panelY + 185;
    const spacingX = 155;
    const spacingY = 160;

    for (let i = 1; i <= 10; i++) {
      const row = Math.floor((i - 1) / 5);
      const col = (i - 1) % 5;
      const x = gridCenterX + (col - 2) * spacingX;
      const y = gridStartY + row * spacingY;

      const box = this.add.graphics();
      box.fillStyle(0x0d0d1a, 1);
      box.fillRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
      box.lineStyle(1.5, 0x333366, 1);
      box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);

      const avatarImage = this.add.image(x, y, `mc_${i}`)
        .setOrigin(0.5)
        .setDisplaySize(avatarSize - 16, avatarSize - 16)
        .setInteractive({ useHandCursor: true });

      // Hover effect
      avatarImage.on("pointerover", () => {
        if (this.selectedAvatarId !== i) {
          box.clear();
          box.fillStyle(0x0d0d1a, 1);
          box.fillRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
          box.lineStyle(1.5, 0x2dd4bf, 0.5);
          box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
        }
      });

      avatarImage.on("pointerout", () => {
        if (this.selectedAvatarId !== i) {
          box.clear();
          box.fillStyle(0x0d0d1a, 1);
          box.fillRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
          box.lineStyle(1.5, 0x333366, 1);
          box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
        }
      });

      avatarImage.on("pointerdown", () => this.selectAvatar(i, box, x, y, avatarSize));

      if (i === 1) this.selectAvatar(1, box, x, y, avatarSize);
    }

    // --- Bottom Action Row ---
    const actionY = panelY + panelHeight - 58;
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x1a1a2e, 1);
    divider.lineBetween(panelX + 40, actionY - 32, panelX + panelWidth - 40, actionY - 32);

    // "Claim Identity" iNFT button (left)
    this.claimButton = this.createPrimaryButton(
      width / 2 - 160,
      actionY,
      "CLAIM IDENTITY (iNFT)",
      () => this.claimIdentity()
    );

    // "Enter the Village" button (right)
    this.createSecondaryButton(
      width / 2 + 160,
      actionY,
      "ENTER THE VILLAGE →",
      () => this.startGame()
    );

    // Wallet status indicator
    const walletStatusText = this.account
      ? `WALLET: ${this.account.slice(0, 6)}...${this.account.slice(-4)}`
      : "WALLET: NOT CONNECTED";
    const walletColor = this.account ? "#2dd4bf" : "#ff4444";

    this.add.text(width / 2, panelY + panelHeight - 12, walletStatusText, {
      fontFamily: "Inter, monospace",
      fontSize: "10px",
      color: walletColor,
      letterSpacing: 2
    }).setOrigin(0.5);
  }

  createPrimaryButton(x, y, text, callback) {
    const bw = 280, bh = 48;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x2dd4bf, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);

    const label = this.add.text(0, 0, text, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#050505",
      letterSpacing: 2
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear().fillStyle(0x99f0e8, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120 });
    });
    container.on("pointerout", () => {
      bg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });
    container.on("pointerdown", () => { if (this.scene.isActive()) callback(); });

    // Store reference for state updates
    container._label = label;
    container._bg = bg;
    container._bw = bw;
    container._bh = bh;
    return container;
  }

  createSecondaryButton(x, y, text, callback) {
    const bw = 260, bh = 48;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.lineStyle(1.5, 0x2dd4bf, 0.8);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);

    const label = this.add.text(0, 0, text, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#2dd4bf",
      letterSpacing: 2
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear().fillStyle(0x2dd4bf, 0.15).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);
      bg.lineStyle(1.5, 0x2dd4bf, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120 });
    });
    container.on("pointerout", () => {
      bg.clear().lineStyle(1.5, 0x2dd4bf, 0.8).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 24);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });
    container.on("pointerdown", () => { if (this.scene.isActive()) callback(); });
    return container;
  }

  async claimIdentity() {
    if (this.isMinting) return;

    if (!this.account || !this.signer) {
      this._showToast("Connect your wallet first to claim your identity.", "#ff4444");
      return;
    }

    this.isMinting = true;
    this.claimButton.disableInteractive();

    try {
      // Step 1: Prepare metadata via backend
      this._updateClaimButton("PREPARING...", 0x888888);
      console.log("[iNFT] Requesting metadata for mc_" + this.selectedAvatarId);

      const response = await fetch(`${API_BASE_URL}/game/mint-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: this.account,
          avatar_id: `mc_${this.selectedAvatarId}`
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || "Metadata preparation failed");
      }

      const data = await response.json();
      if (!data.success || !data.root_hash) {
        throw new Error(data.message || "Invalid server response");
      }

      console.log("[iNFT] Token URI received:", data.root_hash);

      // Step 2: MetaMask signing — user signs the on-chain mint
      this._updateClaimButton("SIGN IN WALLET...", 0x2dd4bf);
      this._showToast("MetaMask will open — approve the transaction to mint your iNFT.", "#2dd4bf");

      const contract = new ethers.Contract(NARRATIVE_INFT_ADDRESS, NARRATIVE_INFT_ABI, this.signer);
      console.log("[iNFT ERC-7857] Calling safeMint:", this.account, data.token_uri, data.meta_hash);

      // ERC-7857 safeMint requires: (to, uri, metaHash)
      const metaHashBytes32 = data.meta_hash || ethers.ZeroHash;
      const tx = await contract.safeMint(this.account, data.token_uri, metaHashBytes32);
      console.log("[iNFT] Tx sent:", tx.hash);

      // Step 3: Wait for on-chain confirmation
      this._updateClaimButton("CONFIRMING...", 0x888888);
      this._showToast("Transaction submitted — waiting for 0G confirmation...", "#888888");

      const receipt = await tx.wait();
      console.log("[iNFT] Confirmed in block:", receipt.blockNumber);

      // Step 4: Success
      this._updateClaimButton("✓ IDENTITY ANCHORED", 0x22c55e);
      this._showToast(`iNFT minted! Tx: ${tx.hash.slice(0, 12)}...`, "#22c55e");
      this.claimButton.disableInteractive();

    } catch (error) {
      console.error("[iNFT] Minting failed:", error);

      // User rejected — don't alarm them
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        this._showToast("Transaction cancelled.", "#888888");
      } else {
        this._showToast("Minting failed: " + (error.reason || error.message || "Unknown error"), "#ff4444");
      }

      this._updateClaimButton("CLAIM IDENTITY (iNFT)", 0x2dd4bf);
      this.claimButton.setInteractive({ useHandCursor: true });

    } finally {
      this.isMinting = false;
    }
  }

  _updateClaimButton(text, color) {
    if (!this.claimButton?._label || !this.claimButton?._bg) return;
    const { _label, _bg, _bw, _bh } = this.claimButton;
    _label.setText(text);
    _bg.clear().fillStyle(color, 1).fillRoundedRect(-_bw / 2, -_bh / 2, _bw, _bh, 24);
  }

  _showToast(message, color = "#ffffff") {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const toast = this.add.text(width / 2, height - 48, message, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      color: color,
      backgroundColor: "#0a0a14",
      padding: { x: 20, y: 10 },
      align: "center"
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: height - 56,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          delay: 3500,
          duration: 400,
          onComplete: () => toast.destroy()
        });
      }
    });
  }

  selectAvatar(avatarId, box, x, y, avatarSize) {
    // Reset previous selection
    if (this.previousSelectedBox) {
      this.previousSelectedBox.clear();
      this.previousSelectedBox.fillStyle(0x0d0d1a, 1);
      this.previousSelectedBox.fillRoundedRect(this.prevX - avatarSize / 2, this.prevY - avatarSize / 2, avatarSize, avatarSize, 12);
      this.previousSelectedBox.lineStyle(1.5, 0x333366, 1);
      this.previousSelectedBox.strokeRoundedRect(this.prevX - avatarSize / 2, this.prevY - avatarSize / 2, avatarSize, avatarSize, 12);
    }

    this.selectedAvatarId = avatarId;

    // Highlight new selection
    box.clear();
    box.fillStyle(0x0d1a1a, 1);
    box.fillRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);
    box.lineStyle(2, 0x2dd4bf, 1);
    box.strokeRoundedRect(x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize, 12);

    this.previousSelectedBox = box;
    this.prevX = x;
    this.prevY = y;
  }

  startGame() {
    if (this.scene.isActive()) {
      this.scene.start("MenuScene", {
        provider: this.provider,
        signer: this.signer,
        account: this.account,
        userAvatar: { avatarId: this.selectedAvatarId }
      });
    }
  }
}
