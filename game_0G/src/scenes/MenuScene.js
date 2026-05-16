import * as Phaser from "phaser";
import { startNewGame } from "../api";
import { ethers } from "ethers";
import { STAKING_MANAGER_ADDRESS, STAKING_MANAGER_ABI } from "../contractConfig";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.userAvatar = null;
    this.statusText = null;
    this.bgVideo = null;
  }

  init(data) {
    this.provider = data?.provider;
    this.signer = data?.signer;
    this.account = data?.account;
    this.userAvatar = data?.userAvatar;
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

    this.bgVideo = this.add.video(width / 2, height / 2, 'bg04_animated');
    this.bgVideo.setScale(0.45).setScrollFactor(0).setOrigin(0.5);
    if (this.scene.isActive()) {
      try {
        this.bgVideo.play(true);
      } catch (err) {
        if (err.name !== 'AbortError') console.warn("Video play error:", err);
      }
    }

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    const panelWidth = 1000;
    const panelHeight = 500;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 0.85);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
    panel.lineStyle(4, 0xd4af37, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

    this.add.text(width / 2, panelY + 60, "Beyond The Fog", {
      fontFamily: "Georgia, serif",
      fontSize: "48px",
      color: "#ffffff",
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.displayAvatarInfo(width / 2 - 250, height / 2 + 40);
    this.createMenuButtons(width / 2 + 150, height / 2 + 40);

    this.statusText = this.add.text(width / 2, height / 2 + 220, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d4af37'
    }).setOrigin(0.5);

    this.checkActiveSession(width, height);
    this.events.once("shutdown", () => {
      try {
        if (this.bgVideo?.isPlaying) this.bgVideo.stop();
      } catch (e) {}
    });
  }

  checkActiveSession(width, height) {
    const sessionData = localStorage.getItem('btf_active_session_data');
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        // Ensure the session belongs to the current user
        if (data.account.toLowerCase() === this.account?.toLowerCase()) {
          this.createResumeButton(width / 2, height / 2 + 160, data);
        }
      } catch (e) {
        console.error("Failed to parse session data", e);
      }
    }
  }

  createResumeButton(x, y, data) {
    const button = this.createStyledButton(x, y, "RESUME ACTIVE JOURNEY", () => {
      this.statusText.setText("Restoring your journey...");
      this.scene.start("HomeScene", {
        account: this.account,
        signer: this.signer,
        provider: this.provider,
        gameData: data.gameData,
        userAvatar: data.userAvatar,
        difficulty: data.difficulty
      });
    });
    // Make it highlight differently
    button.list[0].clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-175, -30, 350, 60, 15);
    button.list[2].setColor("#000000").setFontStyle("bold");
  }

  displayAvatarInfo(x, y) {
    if (!this.userAvatar) return;
    
    const avatarY = y - 100;
    const avatarSize = 150;

    this.add.graphics()
      .lineStyle(3, 0xd4af37, 1)
      .strokeCircle(x, avatarY, avatarSize / 2 + 4);

    const avatarImage = this.add.image(x, avatarY, `mc_${this.userAvatar.avatarId}`)
      .setOrigin(0.5)
      .setDisplaySize(avatarSize, avatarSize);
    
    this.add.text(x, y, `Identity Selected`, {
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const addressDisplay = this.account ? (this.account.substring(0, 6) + "..." + this.account.substring(this.account.length - 4)) : "Guest";
    this.add.text(x, y + 40, addressDisplay, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#d4af37"
    }).setOrigin(0.5);
  }

  createMenuButtons(x, y) {
    this.createStyledButton(x, y - 80, "Start New Game", () => this.showGameSettingsModal());
    this.createStyledButton(x, y, "How to Play", () => {
      this.scene.start("HowToScene", {
        provider: this.provider,
        signer: this.signer,
        account: this.account,
        userAvatar: this.userAvatar,
      });
    });
    this.createStyledButton(x, y + 80, "Leaderboard", () => {
      this.scene.start('LeaderboardScene', {
        account: this.account,
        signer: this.signer,
        provider: this.provider,
        userAvatar: this.userAvatar,
      });
    });
  }

  createStyledButton(x, y, text, callback) {
    const buttonWidth = 350;
    const buttonHeight = 60;
    const button = this.add.container(x, y);

    const bg = this.add.graphics()
      .fillStyle(0x333333, 1)
      .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const border = this.add.graphics()
      .lineStyle(2, 0xd4af37, 1)
      .strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

    const txt = this.add.text(0, 0, text, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);

    button.add([bg, border, txt]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      if (!this.scene.isActive()) return;
      bg.clear().fillStyle(0x444444, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      if (this.tweens) this.tweens.add({ targets: button, scale: 1.05, duration: 150 });
    });

    button.on("pointerout", () => {
      if (!this.scene.isActive()) return;
      bg.clear().fillStyle(0x333333, 1).fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
      if (this.tweens) this.tweens.add({ targets: button, scale: 1, duration: 150 });
    });

    button.on("pointerdown", () => {
      if (this.scene.isActive()) callback();
    });
    return button;
  }

  showGameSettingsModal() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);
    overlay.setInteractive();

    const modalWidth = 600;
    const modalHeight = 450;
    const mx = width / 2;
    const my = height / 2;

    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x1a1a2e, 1);
    modalBg.fillRoundedRect(mx - modalWidth/2, my - modalHeight/2, modalWidth, modalHeight, 20);
    modalBg.lineStyle(2, 0xd4af37, 1);
    modalBg.strokeRoundedRect(mx - modalWidth/2, my - modalHeight/2, modalWidth, modalHeight, 20);

    const title = this.add.text(mx, my - 180, "GAME SETTINGS", {
      fontFamily: 'Cinzel', fontSize: '32px', color: '#d4af37', letterSpacing: 2
    }).setOrigin(0.5);

    let isStaked = false;
    let selectedDifficulty = 'normal';
    let stakeAmount = 0.01;

    const elements = [overlay, modalBg, title];

    // Difficulty Options
    const diffTitle = this.add.text(mx, my - 120, "Select Difficulty", { fontFamily: 'Inter', fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
    elements.push(diffTitle);

    const diffs = ['easy', 'normal', 'hard'];
    const diffButtons = [];
    diffs.forEach((diff, i) => {
      const bx = mx - 150 + (i * 150);
      const by = my - 80;
      
      const btnBg = this.add.graphics();
      const drawBtn = (selected) => {
        btnBg.clear();
        btnBg.fillStyle(selected ? 0x2dd4bf : 0x333333, 1);
        btnBg.fillRoundedRect(bx - 60, by - 20, 120, 40, 8);
        btnBg.lineStyle(2, selected ? 0xffffff : 0x555555, 1);
        btnBg.strokeRoundedRect(bx - 60, by - 20, 120, 40, 8);
      };
      
      drawBtn(diff === selectedDifficulty);
      
      const txt = this.add.text(bx, by, diff.toUpperCase(), { fontFamily: 'Inter', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      
      const hitArea = this.add.rectangle(bx, by, 120, 40, 0x000000, 0).setInteractive({useHandCursor: true});
      hitArea.on('pointerdown', () => {
        selectedDifficulty = diff;
        diffButtons.forEach(b => b.update(b.diff === selectedDifficulty));
      });
      
      diffButtons.push({ update: drawBtn, diff });
      elements.push(btnBg, txt, hitArea);
    });

    // Mode Options
    const modeTitle = this.add.text(mx, my - 20, "Game Mode", { fontFamily: 'Inter', fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
    elements.push(modeTitle);

    const modes = [
      { id: false, label: "CASUAL (Free)" },
      { id: true, label: "RANKED (Stake 0G)" }
    ];
    const modeButtons = [];
    modes.forEach((mode, i) => {
      const bx = mx - 120 + (i * 240);
      const by = my + 20;
      
      const btnBg = this.add.graphics();
      const drawBtn = (selected) => {
        btnBg.clear();
        btnBg.fillStyle(selected ? 0xd4af37 : 0x333333, 1);
        btnBg.fillRoundedRect(bx - 100, by - 20, 200, 40, 8);
        btnBg.lineStyle(2, selected ? 0xffffff : 0x555555, 1);
        btnBg.strokeRoundedRect(bx - 100, by - 20, 200, 40, 8);
      };
      
      drawBtn(mode.id === isStaked);
      
      const txt = this.add.text(bx, by, mode.label, { fontFamily: 'Inter', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      
      const hitArea = this.add.rectangle(bx, by, 200, 40, 0x000000, 0).setInteractive({useHandCursor: true});
      hitArea.on('pointerdown', () => {
        isStaked = mode.id;
        modeButtons.forEach(b => b.update(b.id === isStaked));
        stakeContainer.setVisible(isStaked);
      });
      
      modeButtons.push({ update: drawBtn, id: mode.id });
      elements.push(btnBg, txt, hitArea);
    });

    // Stake Amount UI (Hidden by default)
    const stakeContainer = this.add.container(mx, my + 90).setVisible(false);
    elements.push(stakeContainer);
    
    const stakeTitle = this.add.text(0, -20, "Select Stake Amount (0G)", { fontFamily: 'Inter', fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
    stakeContainer.add(stakeTitle);

    const stakes = [0.00001, 0.001, 0.01, 0.05, 0.1];
    const stakeButtons = [];
    stakes.forEach((amt, i) => {
      const bx = -160 + (i * 80);
      const by = 20;
      
      const btnBg = this.add.graphics();
      const drawBtn = (selected) => {
        btnBg.clear();
        btnBg.fillStyle(selected ? 0xe67e22 : 0x333333, 1);
        btnBg.fillRoundedRect(bx - 40, by - 20, 80, 40, 8);
        btnBg.lineStyle(2, selected ? 0xffffff : 0x555555, 1);
        btnBg.strokeRoundedRect(bx - 40, by - 20, 80, 40, 8);
      };
      
      drawBtn(amt === stakeAmount);
      
      const txt = this.add.text(bx, by, amt.toString(), { fontFamily: 'Inter', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      
      const hitArea = this.add.rectangle(bx, by, 80, 40, 0x000000, 0).setInteractive({useHandCursor: true});
      hitArea.on('pointerdown', () => {
        stakeAmount = amt;
        stakeButtons.forEach(b => b.update(b.amt === stakeAmount));
      });
      
      stakeButtons.push({ update: drawBtn, amt });
      stakeContainer.add([btnBg, txt, hitArea]);
    });

    // Start Button
    const startBg = this.add.graphics();
    startBg.fillStyle(0x2dd4bf, 1);
    startBg.fillRoundedRect(mx - 150, my + 150, 300, 50, 10);
    const startTxt = this.add.text(mx, my + 175, "SIGN & START", { fontFamily: 'Cinzel', fontSize: '22px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    
    const startHitArea = this.add.rectangle(mx, my + 175, 300, 50, 0x000000, 0).setInteractive({useHandCursor: true});
    startHitArea.on('pointerdown', () => {
      elements.forEach(e => e.destroy());
      startBg.destroy();
      startTxt.destroy();
      startHitArea.destroy();
      closeHitArea.destroy();
      closeTxt.destroy();
      
      this.startGame(selectedDifficulty, isStaked, stakeAmount);
    });
    
    // Close Button
    const closeTxt = this.add.text(mx + modalWidth/2 - 20, my - modalHeight/2 + 20, "✕", { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    const closeHitArea = this.add.rectangle(mx + modalWidth/2 - 20, my - modalHeight/2 + 20, 40, 40, 0x000000, 0).setInteractive({useHandCursor: true});
    closeHitArea.on('pointerdown', () => {
      elements.forEach(e => e.destroy());
      startBg.destroy();
      startTxt.destroy();
      startHitArea.destroy();
      closeHitArea.destroy();
      closeTxt.destroy();
    });

    elements.push(startBg, startTxt, startHitArea, closeTxt, closeHitArea);
  }

  async startGame(difficulty, isStaked, stakeAmount) {
    this.statusText.setText("Preparing the fog...");
    this.statusText.setColor('#2dd4bf');
    
    // START FETCHING IN PARALLEL - This saves ~10 seconds of wait time
    const gameDataPromise = startNewGame(this.account, difficulty, isStaked);

    if (isStaked && stakeAmount > 0) {
      if (!this.signer) {
        this.statusText.setText("Wallet not connected for staking.");
        this.statusText.setColor('#e74c3c');
        return;
      }
      this.statusText.setText("Checking for active stakes...");
      this.statusText.setColor('#d4af37');
      try {
        const stakingContract = new ethers.Contract(STAKING_MANAGER_ADDRESS, STAKING_MANAGER_ABI, this.signer);
        
        // --- On-Chain Stake Verification ---
        // If the user already has a stake, we don't ask them to stake again.
        // This is crucial for refresh-persistence and error recovery.
        const currentStake = await stakingContract.getStake(this.account);
        const amountWei = ethers.parseEther(stakeAmount.toString());

        if (currentStake >= amountWei) {
            this.statusText.setText("Active stake found! Continuing...");
            console.log("On-chain stake detected, skipping transaction.");
        } else {
            this.statusText.setText("Staking 0G...");
            const stakeTx = await stakingContract.stake({ value: amountWei });
            this.statusText.setText("Waiting for staking confirmation...");
            await stakeTx.wait();
            this.statusText.setText("Tokens staked! Initializing journey...");
        }
      } catch (err) {
        console.error("Staking/Verification failed", err);
        this.statusText.setText("Staking failed. Game start aborted.");
        this.statusText.setColor('#e74c3c');
        return;
      }
    } else if (!isStaked) {
      if (!this.signer) {
        this.statusText.setText("Wallet not connected.");
        return;
      }
      this.statusText.setText("Please sign to confirm game start...");
      this.statusText.setColor('#2dd4bf');
      try {
        const message = "I agree to save my game on the 0G Galileo testnet.";
        await this.signer.signMessage(message);
      } catch (err) {
        console.error("Signature rejected", err);
        this.statusText.setText("Signature rejected. Game start aborted.");
        this.statusText.setColor('#e74c3c');
        return;
      }
    }

    this.statusText.setText("Finalizing the mystery with Gemini...");
    this.statusText.setColor('#2dd4bf');
    
    const gameData = await gameDataPromise;

    if (gameData) {
      this.scene.start("HomeScene", {
        account: this.account,
        signer: this.signer,
        provider: this.provider,
        gameData: gameData,
        userAvatar: this.userAvatar,
        difficulty: difficulty
      });
    } else {
      this.statusText.setText("Failed to start game. Check backend connection.");
      this.statusText.setColor('#e74c3c');
    }
  }
}
