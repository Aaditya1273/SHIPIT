import * as Phaser from "phaser";
import { submitGameResult } from '../api';

export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
        this.isProcessing = false;
        this.statusText = null;
    }

    init(data) {
        this.endGameData = data;
        this.account = data?.account;
        this.signer = data?.signer;
    }

    create() {
        // Clear active session on game completion
        localStorage.removeItem('btf_session_active');
        localStorage.removeItem('btf_active_session_data');
        localStorage.removeItem('btf_game_id');
        localStorage.removeItem('btf_session_token');
        this.registry.set('elapsedTime', 0);
        this.registry.set('elapsedTimeSessionId', null);

        this.cameras.main.fadeIn(1000, 0, 0, 0);
        
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Backdrop
        this.add.rectangle(0, 0, width, height, 0x050505, 0.95).setOrigin(0);

        const isWin = this.endGameData.isCorrect;
        const titleText = isWin ? 'MYSTERY SOLVED' : 'LOST IN THE FOG';
        const accentColor = isWin ? 0x2dd4bf : 0xe74c3c;
        const accentHex = isWin ? '#2dd4bf' : '#e74c3c';

        // Premium Panel
        const panel = this.add.graphics();
        panel.fillStyle(0x0a0a0a, 0.8);
        panel.fillRoundedRect(centerX - 350, centerY - 250, 700, 500, 24);
        panel.lineStyle(2, accentColor, 0.3);
        panel.strokeRoundedRect(centerX - 350, centerY - 250, 700, 500, 24);

        // Title
        this.add.text(centerX, centerY - 180, titleText, {
            fontFamily: 'Cinzel', fontSize: '56px', color: accentHex, fontWeight: '900', letterSpacing: 8
        }).setOrigin(0.5);

        // Decorative line
        panel.lineStyle(1, accentColor, 0.1);
        panel.lineBetween(centerX - 200, centerY - 120, centerX + 200, centerY - 120);

        // Stats Grid
        const stats = [
            { label: 'SCORE', value: this.endGameData.score },
            { label: 'TIME', value: this.endGameData.time },
            { label: 'GUESSES', value: this.endGameData.guesses },
            { label: 'TRUE ENDING', value: this.endGameData.isTrueEnding ? 'YES' : 'NO' }
        ];

        stats.forEach((stat, i) => {
            const y = centerY - 50 + (i * 45);
            this.add.text(centerX - 120, y, stat.label, {
                fontFamily: 'Inter', fontSize: '14px', color: '#666666', letterSpacing: 2
            }).setOrigin(0, 0.5);
            
            this.add.text(centerX + 120, y, stat.value.toString(), {
                fontFamily: 'Inter', fontSize: '18px', color: '#ffffff', fontWeight: '700'
            }).setOrigin(1, 0.5);
        });

        // Status Text
        this.statusText = this.add.text(centerX, centerY + 160, 'SYNCHRONIZING WITH 0G NEWTON...', {
            fontFamily: 'Inter', fontSize: '12px', color: accentHex, letterSpacing: 2
        }).setOrigin(0.5);

        // Return Button
        const returnBtn = this.add.container(centerX, centerY + 240);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(accentColor, 1);
        btnBg.fillRoundedRect(-150, -25, 300, 50, 12);
        const btnText = this.add.text(0, 0, 'RETURN TO VOID', {
            fontFamily: 'Inter', fontSize: '14px', color: '#000000', fontWeight: '900', letterSpacing: 2
        }).setOrigin(0.5);
        
        returnBtn.add([btnBg, btnText]);
        returnBtn.setSize(300, 50).setInteractive({ useHandCursor: true });
        returnBtn.on('pointerdown', () => window.location.reload());
        returnBtn.on('pointerover', () => btnBg.clear().fillStyle(0xffffff, 1).fillRoundedRect(-150, -25, 300, 50, 12));
        returnBtn.on('pointerout', () => btnBg.clear().fillStyle(accentColor, 1).fillRoundedRect(-150, -25, 300, 50, 12));

        if (this.account) {
            this.finalizeGame();
        }
    }


    async finalizeGame() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            this.statusText.setText('ANCHORING JOURNEY TO 0G STORAGE...');
            
            const result = await submitGameResult({
                game_id: this.endGameData.gameSessionId,
                user_address: this.account,
                score: this.endGameData.score,
                won: this.endGameData.isCorrect,
                is_true_ending: this.endGameData.isTrueEnding
            });

            if (result.success) {
                const reward = (result.reward / 1e18).toFixed(4);
                this.statusText.setText(`✓ JOURNEY ANCHORED. REWARD: ${reward} 0G DISTRIBUTED.`);
                this.statusText.setColor('#2dd4bf');
            } else {
                this.statusText.setText('PROTOCOL ERROR: FAILED TO ANCHOR JOURNEY.');
                this.statusText.setColor('#e74c3c');
            }
        } catch (error) {
            console.error("Finalization failed:", error);
            this.statusText.setText('CRITICAL ERROR: CONNECTION TO 0G LOST.');
            this.statusText.setColor('#e74c3c');
        } finally {
            this.isProcessing = false;
        }
    }
}
