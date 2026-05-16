import * as Phaser from "phaser";
import { API_BASE_URL } from "../api.js";

const API_BASE = API_BASE_URL;
const GOLD = 0xd4af37;
const TEAL = 0x2dd4bf;
const DARK_BG = 0x0d0d0d;
const PANEL_BG = 0x111318;
const ACTIVE_TAB = 0x1c2030;
const TEXT_MUTED = "#6b7280";
const TEXT_PRIMARY = "#f9fafb";
const TEXT_GOLD = "#d4af37";
const TEXT_TEAL = "#2dd4bf";
const TEXT_ERROR = "#ef4444";

export class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: "LeaderboardScene" });
        this.provider = null;
        this.signer = null;
        this.account = null;
        this.activeTab = "leaderboard"; // 'leaderboard' | 'portfolio'
        this.contentObjects = [];
        this.tabObjects = [];
    }

    init(data) {
        this.provider = data.provider;
        this.signer = data.signer;
        this.account = data.account;
        this.userAvatar = data.userAvatar;
    }

    preload() {
        this.load.video("bg_video", "assets/cut-scene/bg04_animated.mp4", "loadeddata", false, true);
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // ── Background ──────────────────────────────────────────────────
        const framePad = 16;
        const frameW = W - framePad * 2;
        const frameH = H - framePad * 2;

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(framePad, framePad, frameW, frameH, 24);
        this.cameras.main.setMask(maskShape.createGeometryMask());

        try {
            const bgVideo = this.add.video(W / 2, H / 2, "bg_video").play(true);
            bgVideo.setScale(Math.min(W / bgVideo.width, H / bgVideo.height) * 0.5).setScrollFactor(0).setOrigin(0.5);
        } catch (e) { /* video optional */ }

        this.add.rectangle(0, 0, W, H, DARK_BG, 0.92).setOrigin(0);

        // ── Frame border ─────────────────────────────────────────────────
        const frameBorder = this.add.graphics();
        frameBorder.lineStyle(1.5, GOLD, 0.7);
        frameBorder.strokeRoundedRect(framePad, framePad, frameW, frameH, 24);
        frameBorder.setDepth(200);

        // ── Main panel ───────────────────────────────────────────────────
        const panelW = 720;
        const panelH = 560;
        const panelX = W / 2 - panelW / 2;
        const panelY = H / 2 - panelH / 2;

        const panel = this.add.graphics();
        panel.fillStyle(PANEL_BG, 0.97);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        panel.lineStyle(1, GOLD, 0.35);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);

        // ── Header ───────────────────────────────────────────────────────
        this.add.text(W / 2, panelY + 32, "BEYOND THE FOG", {
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: "13px",
            color: TEXT_MUTED,
            letterSpacing: 5,
        }).setOrigin(0.5);

        this.add.text(W / 2, panelY + 56, "Hall of Legends", {
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: "26px",
            color: TEXT_GOLD,
        }).setOrigin(0.5);

        // Gold underline
        const line = this.add.graphics();
        line.lineStyle(1, GOLD, 0.4);
        line.lineBetween(panelX + 40, panelY + 80, panelX + panelW - 40, panelY + 80);

        // ── Tab bar ──────────────────────────────────────────────────────
        const tabY = panelY + 96;
        const tabW = 180;
        const tabH = 36;
        const tab1X = W / 2 - tabW - 4;
        const tab2X = W / 2 + 4;

        this.tab1Bg = this.add.graphics();
        this.tab2Bg = this.add.graphics();

        this.tab1Text = this.add.text(tab1X + tabW / 2, tabY + tabH / 2, "🏆  Leaderboard", {
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: TEXT_PRIMARY,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tab2Text = this.add.text(tab2X + tabW / 2, tabY + tabH / 2, "📊  My Portfolio", {
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: TEXT_MUTED,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this._drawTabs(tabY, tabW, tabH, tab1X, tab2X);

        this.tab1Text.on("pointerdown", () => {
            if (this.activeTab !== "leaderboard") {
                this.activeTab = "leaderboard";
                this.tab1Text.setColor(TEXT_PRIMARY);
                this.tab2Text.setColor(TEXT_MUTED);
                this._drawTabs(tabY, tabW, tabH, tab1X, tab2X);
                this._clearContent();
                this._loadLeaderboard(panelX, panelY, panelW, panelH);
            }
        });

        this.tab2Text.on("pointerdown", () => {
            if (this.activeTab !== "portfolio") {
                this.activeTab = "portfolio";
                this.tab1Text.setColor(TEXT_MUTED);
                this.tab2Text.setColor(TEXT_TEAL);
                this._drawTabs(tabY, tabW, tabH, tab1X, tab2X);
                this._clearContent();
                this._loadPortfolio(panelX, panelY, panelW, panelH);
            }
        });

        // ── Content divider ──────────────────────────────────────────────
        const divider = this.add.graphics();
        divider.lineStyle(1, GOLD, 0.2);
        divider.lineBetween(panelX + 24, tabY + tabH + 8, panelX + panelW - 24, tabY + tabH + 8);

        // ── Footer: Back button ──────────────────────────────────────────
        const backBtn = this.add.text(W / 2, panelY + panelH - 24, "← Return to Village", {
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: TEXT_MUTED,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on("pointerover", () => backBtn.setColor(TEXT_GOLD));
        backBtn.on("pointerout", () => backBtn.setColor(TEXT_MUTED));
        backBtn.on("pointerdown", () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(320, () => {
                this.scene.start("MenuScene", {
                    provider: this.provider,
                    signer: this.signer,
                    account: this.account,
                });
            });
        });

        this.input.keyboard.once("keydown-ESC", () => backBtn.emit("pointerdown"));
        this.input.keyboard.once("keydown-SPACE", () => backBtn.emit("pointerdown"));

        // ── Initial load ─────────────────────────────────────────────────
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this._loadLeaderboard(panelX, panelY, panelW, panelH);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Tab rendering
    // ────────────────────────────────────────────────────────────────────────
    _drawTabs(tabY, tabW, tabH, tab1X, tab2X) {
        this.tab1Bg.clear();
        this.tab2Bg.clear();

        if (this.activeTab === "leaderboard") {
            this.tab1Bg.fillStyle(ACTIVE_TAB, 1);
            this.tab1Bg.fillRoundedRect(tab1X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
            this.tab1Bg.lineStyle(1, GOLD, 0.6);
            this.tab1Bg.strokeRoundedRect(tab1X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
            this.tab1Bg.lineStyle(2, GOLD, 1);
            this.tab1Bg.lineBetween(tab1X + 1, tabY + tabH, tab1X + tabW - 1, tabY + tabH);

            this.tab2Bg.fillStyle(0x0a0a0e, 0.5);
            this.tab2Bg.fillRoundedRect(tab2X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
        } else {
            this.tab2Bg.fillStyle(ACTIVE_TAB, 1);
            this.tab2Bg.fillRoundedRect(tab2X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
            this.tab2Bg.lineStyle(1, TEAL, 0.6);
            this.tab2Bg.strokeRoundedRect(tab2X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
            this.tab2Bg.lineStyle(2, TEAL, 1);
            this.tab2Bg.lineBetween(tab2X + 1, tabY + tabH, tab2X + tabW - 1, tabY + tabH);

            this.tab1Bg.fillStyle(0x0a0a0e, 0.5);
            this.tab1Bg.fillRoundedRect(tab1X, tabY, tabW, tabH, { tl: 8, tr: 8, bl: 0, br: 0 });
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Content clearing
    // ────────────────────────────────────────────────────────────────────────
    _clearContent() {
        this.contentObjects.forEach(obj => { try { obj.destroy(); } catch (e) {} });
        this.contentObjects = [];
    }

    _addContent(obj) {
        this.contentObjects.push(obj);
        return obj;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  LEADERBOARD TAB
    // ────────────────────────────────────────────────────────────────────────
    async _loadLeaderboard(panelX, panelY, panelW, panelH) {
        const W = this.cameras.main.width;
        const contentStartY = panelY + 148;

        const spinner = this._addContent(this.add.text(W / 2, contentStartY + 80, "Loading rankings…", {
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: TEXT_MUTED,
        }).setOrigin(0.5));

        try {
            const res = await fetch(`${API_BASE}/api/leaderboard`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            spinner.destroy();

            if (!data.success || !data.leaderboard.length) {
                this._addContent(this.add.text(W / 2, contentStartY + 80, "No rankings recorded yet.\nBe the first to complete a run.", {
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "15px",
                    color: TEXT_MUTED,
                    align: "center",
                    lineSpacing: 8,
                }).setOrigin(0.5));
                return;
            }

            this._renderLeaderboard(data.leaderboard, panelX, panelY, panelW, contentStartY);
        } catch (err) {
            console.error("Leaderboard fetch failed:", err);
            spinner.setText("Failed to load data.\nCheck backend connection.");
            spinner.setColor(TEXT_ERROR);
        }
    }

    _renderLeaderboard(rows, panelX, panelY, panelW, startY) {
        const W = this.cameras.main.width;
        const colRank = panelX + 48;
        const colAddr = panelX + 120;
        const colScore = panelX + panelW - 64;
        const rowH = 40;
        const rankColors = [TEXT_GOLD, "#c0c0c0", "#cd7f32"];
        const rankEmojis = ["🥇", "🥈", "🥉"];

        // Column headers
        this._addContent(this.add.text(colRank, startY, "#", {
            fontFamily: "'Inter', sans-serif", fontSize: "11px", color: TEXT_MUTED, letterSpacing: 2,
        }).setOrigin(0, 0.5));
        this._addContent(this.add.text(colAddr, startY, "PLAYER ADDRESS", {
            fontFamily: "'Inter', sans-serif", fontSize: "11px", color: TEXT_MUTED, letterSpacing: 2,
        }).setOrigin(0, 0.5));
        this._addContent(this.add.text(colScore, startY, "BEST SCORE", {
            fontFamily: "'Inter', sans-serif", fontSize: "11px", color: TEXT_MUTED, letterSpacing: 2,
        }).setOrigin(1, 0.5));

        // Header underline
        const headerLine = this._addContent(this.add.graphics());
        headerLine.lineStyle(1, 0x2a2e3a, 1);
        headerLine.lineBetween(panelX + 24, startY + 16, panelX + panelW - 24, startY + 16);

        rows.slice(0, 10).forEach((entry, i) => {
            const y = startY + 28 + i * rowH;
            const isCurrentUser = this.account && entry.address.toLowerCase() === this.account.toLowerCase();
            const isTopThree = i < 3;

            // Row highlight for current user or top 3
            if (isCurrentUser) {
                const rowBg = this._addContent(this.add.graphics());
                rowBg.fillStyle(TEAL, 0.06);
                rowBg.fillRoundedRect(panelX + 24, y - rowH / 2 + 4, panelW - 48, rowH - 4, 6);
                rowBg.lineStyle(1, TEAL, 0.3);
                rowBg.strokeRoundedRect(panelX + 24, y - rowH / 2 + 4, panelW - 48, rowH - 4, 6);
            }

            // Rank
            const rankLabel = isTopThree ? rankEmojis[i] : `${i + 1}`;
            this._addContent(this.add.text(colRank, y, rankLabel, {
                fontFamily: "'Inter', sans-serif",
                fontSize: isTopThree ? "16px" : "14px",
                color: isTopThree ? rankColors[i] : TEXT_MUTED,
            }).setOrigin(0, 0.5));

            // Address
            const shortAddr = `${entry.address.substring(0, 6)}…${entry.address.slice(-4)}`;
            const addrColor = isCurrentUser ? TEXT_TEAL : (isTopThree ? TEXT_PRIMARY : TEXT_MUTED);
            const addrText = this._addContent(this.add.text(colAddr, y, isCurrentUser ? `${shortAddr} (You)` : shortAddr, {
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: addrColor,
            }).setOrigin(0, 0.5));

            // Score
            this._addContent(this.add.text(colScore, y, entry.score.toLocaleString(), {
                fontFamily: "'Inter', sans-serif",
                fontSize: "15px",
                color: isTopThree ? rankColors[i] : TEXT_PRIMARY,
                fontStyle: isTopThree ? "bold" : "normal",
            }).setOrigin(1, 0.5));

            // Row divider
            if (i < rows.length - 1) {
                const rowDiv = this._addContent(this.add.graphics());
                rowDiv.lineStyle(1, 0x1e2232, 1);
                rowDiv.lineBetween(panelX + 24, y + rowH / 2, panelX + panelW - 24, y + rowH / 2);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    //  PORTFOLIO TAB
    // ────────────────────────────────────────────────────────────────────────
    async _loadPortfolio(panelX, panelY, panelW, panelH) {
        const W = this.cameras.main.width;
        const contentStartY = panelY + 148;

        if (!this.account) {
            this._addContent(this.add.text(W / 2, contentStartY + 80, "Connect your wallet to view portfolio.", {
                fontFamily: "'Inter', sans-serif", fontSize: "15px", color: TEXT_MUTED,
            }).setOrigin(0.5));
            return;
        }

        const spinner = this._addContent(this.add.text(W / 2, contentStartY + 80, "Fetching on-chain data…", {
            fontFamily: "'Inter', sans-serif", fontSize: "14px", color: TEXT_MUTED,
        }).setOrigin(0.5));

        try {
            const res = await fetch(`${API_BASE}/api/portfolio/${this.account}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            spinner.destroy();

            if (!data.success) throw new Error(data.error || "Unknown error");

            this._renderPortfolio(data, panelX, panelY, panelW, contentStartY);
        } catch (err) {
            console.error("Portfolio fetch failed:", err);
            spinner.setText("Failed to load portfolio.\nCheck backend connection.");
            spinner.setColor(TEXT_ERROR);
        }
    }

    _renderPortfolio(data, panelX, panelY, panelW, startY) {
        const W = this.cameras.main.width;
        const { stats, history } = data;

        // ── Layout Definition ─────────────────────────────────────────
        const leftColX = panelX + 32;
        const leftColW = 220;
        const rightColX = leftColX + leftColW + 24;
        const rightColW = panelW - leftColW - 80;

        // ── 1. NFT Identity Card (Left Column) ─────────────────────────
        const cardBg = this._addContent(this.add.graphics());
        cardBg.fillStyle(0x0a0d14, 1);
        cardBg.fillRoundedRect(leftColX, startY, leftColW, 290, 16);
        cardBg.lineStyle(1, GOLD, 0.4);
        cardBg.strokeRoundedRect(leftColX, startY, leftColW, 290, 16);

        // Card Header
        this._addContent(this.add.text(leftColX + leftColW / 2, startY + 24, "iNFT IDENTITY", {
            fontFamily: "'Cinzel', Georgia, serif", fontSize: "14px", color: TEXT_GOLD, letterSpacing: 2,
        }).setOrigin(0.5));

        this._addContent(this.add.text(leftColX + leftColW / 2, startY + 44, "ANCHORED ON 0G NEWTON", {
            fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_TEAL, letterSpacing: 1,
        }).setOrigin(0.5));

        // Avatar Image
        const avatarSize = 140;
        const avatarY = startY + 130;
        
        // Render a subtle glow behind the avatar
        const glow = this._addContent(this.add.graphics());
        glow.fillStyle(TEAL, 0.1);
        glow.fillCircle(leftColX + leftColW / 2, avatarY, avatarSize / 2 + 10);
        
        if (this.userAvatar && this.userAvatar.avatarId) {
            this._addContent(this.add.image(leftColX + leftColW / 2, avatarY, `mc_${this.userAvatar.avatarId}`)
                .setOrigin(0.5).setDisplaySize(avatarSize, avatarSize));
        } else {
            this._addContent(this.add.text(leftColX + leftColW / 2, avatarY, "?", {
                fontFamily: "'Cinzel', serif", fontSize: "64px", color: 0x333333
            }).setOrigin(0.5));
        }

        // NFT Metadata Footer
        const shortAddr = this.account ? `${this.account.slice(0,6)}...${this.account.slice(-4)}` : "Unregistered";
        this._addContent(this.add.text(leftColX + leftColW / 2, startY + 230, "OWNER", {
            fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_MUTED, letterSpacing: 2,
        }).setOrigin(0.5));
        this._addContent(this.add.text(leftColX + leftColW / 2, startY + 246, shortAddr, {
            fontFamily: "'Inter', sans-serif", fontSize: "12px", color: TEXT_PRIMARY,
        }).setOrigin(0.5));
        
        this._addContent(this.add.text(leftColX + leftColW / 2, startY + 266, "ERC-721 ENUMERABLE", {
            fontFamily: "'Inter', sans-serif", fontSize: "8px", color: 0x4b5563, letterSpacing: 1,
        }).setOrigin(0.5));


        // ── 2. Stats Row (Right Column, Top) ───────────────────────────
        const statCards = [
            { label: "GAMES PLAYED", value: stats.games_played, color: TEXT_GOLD },
            { label: "BEST SCORE", value: stats.best_score.toLocaleString(), color: TEXT_TEAL },
            { label: "0G SYNC", value: stats.on_chain_sync ? "LIVE ✓" : "PENDING", color: stats.on_chain_sync ? TEXT_TEAL : TEXT_MUTED },
        ];

        const statCardW = rightColW / 3 - 8;
        statCards.forEach((card, i) => {
            const cx = rightColX + i * (statCardW + 12);
            const statBg = this._addContent(this.add.graphics());
            statBg.fillStyle(0x161b27, 1);
            statBg.fillRoundedRect(cx, startY, statCardW, 64, 8);
            statBg.lineStyle(1, 0x2a2e3a, 1);
            statBg.strokeRoundedRect(cx, startY, statCardW, 64, 8);

            this._addContent(this.add.text(cx + statCardW / 2, startY + 18, card.label, {
                fontFamily: "'Inter', sans-serif", fontSize: "8px", color: TEXT_MUTED, letterSpacing: 1,
            }).setOrigin(0.5));

            this._addContent(this.add.text(cx + statCardW / 2, startY + 42, card.value.toString(), {
                fontFamily: "'Cinzel', Georgia, serif", fontSize: "18px", color: card.color,
            }).setOrigin(0.5));
        });

        // ── 3. Recent Runs Table (Right Column, Middle/Bottom) ─────────
        const histY = startY + 90;
        this._addContent(this.add.text(rightColX, histY, "RECENT RUNS", {
            fontFamily: "'Inter', sans-serif", fontSize: "10px", color: TEXT_MUTED, letterSpacing: 3,
        }).setOrigin(0, 0.5));

        const hdrLine = this._addContent(this.add.graphics());
        hdrLine.lineStyle(1, 0x2a2e3a, 1);
        hdrLine.lineBetween(rightColX, histY + 16, rightColX + rightColW, histY + 16);

        if (!history || history.length === 0) {
            this._addContent(this.add.text(rightColX + rightColW / 2, histY + 60, "No completed runs yet.\nStep into the fog to begin your journey.", {
                fontFamily: "'Inter', sans-serif", fontSize: "12px", color: TEXT_MUTED, align: "center", lineSpacing: 6
            }).setOrigin(0.5));
            return;
        }

        const colDate = rightColX + 8;
        const colResult = rightColX + 90;
        const colScoreH = rightColX + 200;
        const colReward = rightColX + rightColW - 8;
        const rowH = 34;

        this._addContent(this.add.text(colDate, histY + 30, "DATE", { fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_MUTED, letterSpacing: 1 }).setOrigin(0, 0.5));
        this._addContent(this.add.text(colResult, histY + 30, "RESULT", { fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_MUTED, letterSpacing: 1 }).setOrigin(0, 0.5));
        this._addContent(this.add.text(colScoreH, histY + 30, "SCORE", { fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_MUTED, letterSpacing: 1 }).setOrigin(0, 0.5));
        this._addContent(this.add.text(colReward, histY + 30, "REWARD", { fontFamily: "'Inter', sans-serif", fontSize: "9px", color: TEXT_MUTED, letterSpacing: 1 }).setOrigin(1, 0.5));

        [...history].reverse().slice(0, 5).forEach((run, i) => {
            const y = histY + 54 + i * rowH;
            const date = new Date(run.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const result = run.won ? "✓ SOLVED" : "✗ LOST";
            const resultColor = run.won ? TEXT_TEAL : TEXT_ERROR;
            const rewardFog = run.reward ? (run.reward / 1e18).toFixed(2) : "0.00";

            this._addContent(this.add.text(colDate, y, date, { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: TEXT_MUTED }).setOrigin(0, 0.5));
            this._addContent(this.add.text(colResult, y, result, { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: resultColor }).setOrigin(0, 0.5));
            this._addContent(this.add.text(colScoreH, y, run.score.toLocaleString(), { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: TEXT_PRIMARY }).setOrigin(0, 0.5));
            this._addContent(this.add.text(colReward, y, `${rewardFog} FOG`, { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: TEXT_GOLD }).setOrigin(1, 0.5));

            if (i < Math.min(history.length, 5) - 1) {
                const rowDiv = this._addContent(this.add.graphics());
                rowDiv.lineStyle(1, 0x161b27, 1);
                rowDiv.lineBetween(rightColX, y + rowH / 2, rightColX + rightColW, y + rowH / 2);
            }
        });
    }
}