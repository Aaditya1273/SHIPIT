import * as Phaser from "phaser";

const GOLD = 0xd4af37;
const GOLD_BRIGHT = 0xf6d365;
const DARK = 0x0c0b09;
const TEXT = "#f7f1dc";
const MUTED = "#c8bb93";

export class HowToScene extends Phaser.Scene {
  constructor() {
    super({ key: "HowToScene" });
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.userAvatar = null;
    this.bgVideo = null;
  }

  init(data) {
    this.provider = data?.provider;
    this.signer = data?.signer;
    this.account = data?.account;
    this.userAvatar = data?.userAvatar;
  }

  preload() {
    this.load.video("bg04_animated", "/assets/cut-scene/bg04_animated.mp4", "loadeddata", false, true);
    this.load.image("how_to_play_full", "/assets/images/HTP.png");
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    try {
      this.bgVideo = this.add.video(W / 2, H / 2, "bg04_animated");
      this.bgVideo.setScale(0.5).setAlpha(0.55);
      this.bgVideo.play(true);
    } catch (e) {}

    this.add.rectangle(0, 0, W, H, DARK, 0.9).setOrigin(0);

    const frame = this.add.graphics();
    frame.fillStyle(0x120f0c, 0.94);
    frame.fillRoundedRect(16, 16, W - 32, H - 32, 24);
    frame.lineStyle(2, GOLD, 0.95);
    frame.strokeRoundedRect(16, 16, W - 32, H - 32, 24);

    this.add.text(W / 2, 42, "BEYOND THE FOG: COMPLETE GUIDE", {
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      color: "#f5d36b",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, 72, "Wallet, staking, clues, investigation, and final win flow", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: MUTED,
    }).setOrigin(0.5);

    const guide = this.add.image(W / 2, 365, "how_to_play_full").setOrigin(0.5);
    const guideScale = Math.min((W - 70) / guide.width, (H - 150) / guide.height);
    guide.setScale(guideScale);
    guide.setAlpha(0.98);

    const guideBorder = this.add.graphics();
    const guideWidth = guide.width * guideScale;
    const guideHeight = guide.height * guideScale;
    guideBorder.lineStyle(2, GOLD, 0.85);
    guideBorder.strokeRoundedRect(W / 2 - guideWidth / 2 - 6, 365 - guideHeight / 2 - 6, guideWidth + 12, guideHeight + 12, 18);

    const backBtn = this._createBackButton(W - 180, H - 108, "← Back to Menu", () => {
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.time.delayedCall(240, () => {
        this.scene.start("MenuScene", {
          provider: this.provider,
          signer: this.signer,
          account: this.account,
          userAvatar: this.userAvatar,
        });
      });
    });

    this.input.keyboard.once("keydown-ESC", () => backBtn.emit("pointerdown"));
    this.events.once("shutdown", () => {
      try {
        if (this.bgVideo?.isPlaying) this.bgVideo.stop();
      } catch (e) {}
    });
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  _createBackButton(x, y, text, callback) {
    const button = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2417, 1);
    bg.fillRoundedRect(-110, -28, 220, 56, 16);
    bg.lineStyle(2, GOLD, 0.9);
    bg.strokeRoundedRect(-110, -28, 220, 56, 16);

    const label = this.add.text(0, 0, text, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: TEXT,
      fontStyle: "bold",
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(220, 56);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(0x3b311c, 1);
      bg.fillRoundedRect(-110, -28, 220, 56, 16);
      bg.lineStyle(2, GOLD_BRIGHT, 1);
      bg.strokeRoundedRect(-110, -28, 220, 56, 16);
    });
    button.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(0x2a2417, 1);
      bg.fillRoundedRect(-110, -28, 220, 56, 16);
      bg.lineStyle(2, GOLD, 0.9);
      bg.strokeRoundedRect(-110, -28, 220, 56, 16);
    });
    button.on("pointerdown", callback);
    return button;
  }
}
