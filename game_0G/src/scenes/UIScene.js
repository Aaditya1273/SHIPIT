import * as Phaser from "phaser";
import { chooseLocation } from "../api.js";
import { CHAIN_ID, RPC_URL } from "../contractConfig.js";

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
    this.timerText = null;
    this.elapsedSeconds = 0;
    this.inaccessibleLocations = [];
    this.account = null;
    this.difficulty = "Easy";
    this._locationOverlay = null;
    this.locationButton = null;
    this.locationButtonEnabled = false;
    this.resetHintText = null;
    this.maxHearts = 0;
    this.currentHearts = 0;
    this.heartIcons = [];
  }

  init(data) {
    if (data && data.inaccessibleLocations) {
      this.inaccessibleLocations = data.inaccessibleLocations;
      this.account = data.account;
      this.provider = data.provider;
      this.signer = data.signer;
      this.difficulty = data.difficulty || "Easy";
      this.gameSessionId = data.gameSessionId;
      const storedSessionId = this.registry.get("elapsedTimeSessionId");
      if (storedSessionId !== this.gameSessionId) {
        this.elapsedSeconds = 0;
        this.registry.set("elapsedTime", 0);
        this.registry.set("elapsedTimeSessionId", this.gameSessionId);
      } else {
        this.elapsedSeconds = this.registry.get("elapsedTime") || 0;
      }
      
      const diffLower = this.difficulty.toLowerCase();
      this.maxHearts = diffLower === "hard" ? 1 : diffLower === "normal" ? 2 : 3;
      this.currentHearts = this.maxHearts;
    }
  }

  create() {
    const { width, height } = this.cameras.main;
    if (typeof this.elapsedSeconds !== "number") {
      this.elapsedSeconds = this.registry.get("elapsedTime") || 0;
    }

    // Timer Panel (Glassmorphism)
    const timerWidth = 120;
    const timerHeight = 50;
    const timerX = width / 2;
    const timerY = height - 50;

    const timerBg = this.add.graphics();
    timerBg.fillStyle(0x0a0a0a, 0.8);
    timerBg.fillRoundedRect(timerX - timerWidth/2, timerY - timerHeight/2, timerWidth, timerHeight, 12);
    timerBg.lineStyle(1, 0x2dd4bf, 0.3);
    timerBg.strokeRoundedRect(timerX - timerWidth/2, timerY - timerHeight/2, timerWidth, timerHeight, 12);

    this.timerText = this.add.text(timerX, timerY, this.formatTime(this.elapsedSeconds), {
      fontFamily: "Inter",
      fontSize: "20px",
      color: "#2dd4bf",
      fontWeight: "700",
      letterSpacing: 2
    }).setOrigin(0.5);

    this.createInventoryButton();

    if (this.inaccessibleLocations && this.inaccessibleLocations.length > 0) {
      this.createLocationButton();
      this.locationButtonEnabled = this.elapsedSeconds >= 120;
    }

    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });

    this.createHeartsUI();

    // Reset Hint
    this.resetHintText = this.add.text(width - 20, height - 20, "HOLD [R] TO RECOVER", {
      fontFamily: "Inter",
      fontSize: "10px",
      color: "#666666",
      letterSpacing: 1
    }).setOrigin(1, 1);
  }

  createHeartsUI() {
    const startX = 40;
    const startY = 40;
    this.heartsContainer = this.add.container(startX, startY);
    this.heartIcons = [];
    
    for (let i = 0; i < this.maxHearts; i++) {
        const heart = this.add.image(i * 40, 0, "heart")
          .setOrigin(0.5)
          .setDisplaySize(24, 24)
          .setAlpha(0.9);
        this.heartIcons.push(heart);
        this.heartsContainer.add(heart);
    }
  }

  createLocationButton() {
    const { width, height } = this.cameras.main;
    const bx = 120;
    const by = height - 50;
    
    this.locationButton = this.add.container(bx, by);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.9);
    bg.fillRoundedRect(-80, -25, 160, 50, 12);
    bg.lineStyle(1, 0x2dd4bf, 0.2);
    bg.strokeRoundedRect(-80, -25, 160, 50, 12);

    const txt = this.add.text(0, 0, "INVESTIGATE", {
      fontFamily: "Inter",
      fontSize: "14px",
      color: "#ffffff",
      fontWeight: "900",
      letterSpacing: 1
    }).setOrigin(0.5);

    this.locationButton.add([bg, txt]);
    this.locationButton.setSize(160, 50).setInteractive({ useHandCursor: true });

    this.locationButton.on("pointerdown", () => {
      if (this.locationButtonEnabled) this.showLocationChoices();
      else this.showDisabledLocationMessage();
    });

    this.locationButton.on("pointerover", () => bg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-80, -25, 160, 50, 12) && txt.setColor("#000000"));
    this.locationButton.on("pointerout", () => bg.clear().fillStyle(0x1a1a1a, 0.9).fillRoundedRect(-80, -25, 160, 50, 12) && txt.setColor("#ffffff"));
  }

  createInventoryButton() {
    const { width, height } = this.cameras.main;
    const bx = width - 120;
    const by = height - 50;

    const invBtn = this.add.container(bx, by);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.9);
    bg.fillRoundedRect(-80, -25, 160, 50, 12);
    bg.lineStyle(1, 0xffffff, 0.1);
    bg.strokeRoundedRect(-80, -25, 160, 50, 12);

    const txt = this.add.text(0, 0, "INVENTORY", {
      fontFamily: "Inter",
      fontSize: "14px",
      color: "#ffffff",
      fontWeight: "900",
      letterSpacing: 1
    }).setOrigin(0.5);

    invBtn.add([bg, txt]);
    invBtn.setSize(160, 50).setInteractive({ useHandCursor: true });

    invBtn.on("pointerdown", () => {
      const homeScene = this.scene.get("HomeScene");
      if (homeScene && homeScene.scene.isActive()) {
        homeScene.scene.pause();
        this.scene.launch("InventoryScene");
      }
    });

    invBtn.on("pointerover", () => bg.clear().fillStyle(0xffffff, 1).fillRoundedRect(-80, -25, 160, 50, 12) && txt.setColor("#000000"));
    invBtn.on("pointerout", () => bg.clear().fillStyle(0x1a1a1a, 0.9).fillRoundedRect(-80, -25, 160, 50, 12) && txt.setColor("#ffffff"));
  }


  updateTimer() {
    this.elapsedSeconds++;
    this.registry.set("elapsedTime", this.elapsedSeconds);
    this.timerText.setText(this.formatTime(this.elapsedSeconds));

    if (!this.locationButtonEnabled && this.elapsedSeconds >= 120 && this.locationButton) {
      this.locationButtonEnabled = true;
    }
  }

  showDisabledLocationMessage() {
    const remaining = 120 - this.elapsedSeconds;
    const msg = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 120, `INVESTIGATION READY IN ${remaining}s`, {
      fontFamily: "Inter", fontSize: "14px", color: "#ff4444", fontWeight: "900", letterSpacing: 2
    }).setOrigin(0.5);
    this.time.delayedCall(2000, () => msg.destroy());
  }

  showLocationChoices() {
    if (this._locationOverlay) return;
    const { width, height } = this.cameras.main;
    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0).setInteractive();

    const panelHeight = 150 + this.inaccessibleLocations.length * 70;
    const panelWidth = 500;
    const px = width / 2;
    const py = height / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x0a0a0a, 0.95);
    panel.fillRoundedRect(px - panelWidth/2, py - panelHeight/2, panelWidth, panelHeight, 24);
    panel.lineStyle(2, 0x2dd4bf, 0.4);
    panel.strokeRoundedRect(px - panelWidth/2, py - panelHeight/2, panelWidth, panelHeight, 24);

    const title = this.add.text(px, py - panelHeight/2 + 50, "SELECT TARGET LOCATION", {
      fontFamily: "Cinzel", fontSize: "24px", color: "#2dd4bf", fontWeight: "900", letterSpacing: 4
    }).setOrigin(0.5);

    const buttons = this.inaccessibleLocations.map((loc, i) => {
      const by = py - panelHeight/2 + 130 + i * 70;
      const btn = this.add.container(px, by);
      const bg = this.add.graphics();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRoundedRect(-200, -25, 400, 50, 12);
      bg.lineStyle(1, 0x333333, 1);
      bg.strokeRoundedRect(-200, -25, 400, 50, 12);

      const txt = this.add.text(0, 0, loc.toUpperCase(), {
        fontFamily: "Inter", fontSize: "14px", color: "#ffffff", fontWeight: "700", letterSpacing: 2
      }).setOrigin(0.5);

      btn.add([bg, txt]);
      btn.setSize(400, 50).setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.selectLocation(loc));
      btn.on("pointerover", () => bg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-200, -25, 400, 50, 12) && txt.setColor("#000000"));
      btn.on("pointerout", () => bg.clear().fillStyle(0x1a1a1a, 1).fillRoundedRect(-200, -25, 400, 50, 12) && txt.setColor("#ffffff"));
      return btn;
    });

    this._locationOverlay = this.add.container(0, 0, [blocker, panel, title, ...buttons]);
    blocker.on("pointerdown", () => { this._locationOverlay.destroy(); this._locationOverlay = null; });
  }

  async selectLocation(location) {
    if (this._locationOverlay) { this._locationOverlay.destroy(); this._locationOverlay = null; }

    const feedback = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, `INVESTIGATING ${location.toUpperCase()}...`, {
      fontFamily: "Cinzel", fontSize: "32px", color: "#2dd4bf", fontWeight: "900", letterSpacing: 4
    }).setOrigin(0.5).setAlpha(0);
    
    this.tweens.add({ targets: feedback, alpha: 1, duration: 500 });

    const result = await chooseLocation(location, this.account);
    if (!result) {
      feedback.setText("CONNECTION INTERRUPTED").setColor("#ff4444");
      return;
    }

    if (result.is_correct) {
      feedback.setText("TRUTH DISCOVERED").setColor("#2dd4bf");
      this.time.delayedCall(1500, () => {
        const homeScene = this.scene.get("HomeScene");

        // Score calculation with difficulty multiplier
        const BASE_SCORE = 10000;
        const timePenalty = Math.floor(this.elapsedSeconds / 60) * 50;
        const guessPenalty = (homeScene.guessCount || 0) * 1500;
        const nftBonus = (homeScene.playerInventory?.size || 0) * 250;
        const trueEndingBonus = result.is_true_ending ? 500 : 0;
        let rawScore = Math.max(0, BASE_SCORE - timePenalty - guessPenalty + nftBonus + trueEndingBonus);

        // Difficulty multiplier: Easy 1.5x | Normal 1.75x | Hard 2.0x
        const diffLower = (this.difficulty || 'easy').toLowerCase();
        let multiplier = 1.0;
        if (diffLower === 'easy' || diffLower === 'very easy') multiplier = 1.5;
        else if (diffLower === 'normal') multiplier = 1.75;
        else if (diffLower === 'hard') multiplier = 2.0;
        const finalScore = Math.round(rawScore * multiplier);
        
        const endData = {
          isCorrect: true,
          isTrueEnding: result.is_true_ending,
          score: finalScore,
          time: this.formatTime(this.elapsedSeconds),
          guesses: (homeScene.guessCount || 0) + 1,
          nfts: homeScene.playerInventory?.size || 0,
          account: this.account,
          signer: this.signer,
          provider: this.provider,
          difficulty: this.difficulty,
          gameSessionId: this.gameSessionId
        };
        
        this.scene.stop("HomeScene");
        this.scene.start("EndScene", endData);
        this.scene.stop();
      });
    } else {
      this.currentHearts--;
      if (this.currentHearts >= 0 && this.heartIcons[this.currentHearts]) {
        this.tweens.add({ targets: this.heartIcons[this.currentHearts], scale: 0, alpha: 0, duration: 300 });
      }

      if (this.currentHearts <= 0) {
        feedback.setText("LOST IN THE FOG").setColor("#ff4444");
        this.time.delayedCall(2000, () => {
          this.scene.stop("HomeScene");
          this.scene.start("EndScene", { isCorrect: false, score: 0, time: this.formatTime(this.elapsedSeconds), account: this.account });
          this.scene.stop();
        });
      } else {
        feedback.setText("NOTHING BUT SHADOWS").setColor("#ff4444");
        this.elapsedSeconds += 60; // Penalty
        this.time.delayedCall(2000, () => feedback.destroy());
      }
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}
