import * as Phaser from "phaser";
// Import the getConversation function to handle follow-up dialogue
import { getConversation } from '../api'; 

export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: "DialogueScene" });
        this.conversationData = null;
        this.villagerSpriteKey = null;
        this.newGameData = null;
        this.rightPanelContainer = null; 

        this.voices = [];
        this._currentSpeechResolve = null;
        this._currentSpeechTimer = null;
    }

    init(data) {
        this.conversationData = data.conversationData;
        this.villagerSpriteKey = data.villagerSpriteKey;
        this.newGameData = data.newGameData;
        this.account = data.account;
    }

    create() {
        this.initTTS();
        const { width, height } = this.cameras.main;
        
        // Backdrop with heavy blur
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setInteractive();

        const panelWidth = width * 0.85;
        const panelHeight = height * 0.75;
        const px = width / 2;
        const py = height / 2;

        // Glassmorphism Main Panel
        const graphics = this.add.graphics();
        graphics.fillStyle(0x0a0a0a, 0.8);
        graphics.fillRoundedRect(px - panelWidth/2, py - panelHeight/2, panelWidth, panelHeight, 32);
        graphics.lineStyle(2, 0x2dd4bf, 0.3);
        graphics.strokeRoundedRect(px - panelWidth/2, py - panelHeight/2, panelWidth, panelHeight, 32);

        // Portrait Section
        const portraitX = px - panelWidth/2 + 200;
        const portraitY = py;
        
        this.add.image(portraitX, portraitY, this.villagerSpriteKey)
            .setScale(0.8)
            .setOrigin(0.5);

        // Info Panel
        const infoY = py + panelHeight/2 - 100;
        const villagerName = this.conversationData.villager_name || "VILLAGER";
        const currentVillagerInfo = this.newGameData.villagers.find(v => v.id === this.conversationData.villager_id);
        const villagerTitle = currentVillagerInfo ? currentVillagerInfo.title : "MYSTERIOUS FIGURE";

        this.add.text(portraitX, infoY, villagerName.toUpperCase(), {
            fontFamily: 'Cinzel', fontSize: '32px', color: '#ffffff', fontWeight: '900', letterSpacing: 4
        }).setOrigin(0.5);

        this.add.text(portraitX, infoY + 40, villagerTitle.toUpperCase(), {
            fontFamily: 'Inter', fontSize: '14px', color: '#2dd4bf', fontWeight: '700', letterSpacing: 2
        }).setOrigin(0.5);

        // Dialogue Section
        this.rightPanelContainer = this.add.container();
        this.displayConversationInRightPanel(px + 100, py - 100, panelWidth - 400, panelHeight);

        // Close Icon
        const closeBtn = this.add.text(width - 60, 60, '✕', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on('pointerdown', () => {
            this.stopSpeaking();
            this.scene.stop();
            this.scene.resume('HomeScene');
        });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff'));

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    
    initTTS() {
        if (!('speechSynthesis' in window)) return;
        const populateVoiceList = () => {
            this.voices = window.speechSynthesis.getVoices() || [];
        };
        populateVoiceList();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }

     stopSpeaking() {
        try { window.speechSynthesis.cancel(); } catch(e) {}
        if (this._currentSpeechTimer) {
            clearTimeout(this._currentSpeechTimer);
            this._currentSpeechTimer = null;
        }
        if (this._currentSpeechResolve) {
            try { this._currentSpeechResolve(); } catch(e) {}
            this._currentSpeechResolve = null;
        }
    }

   speakText(text, speakerName) {
        if (!('speechSynthesis' in window) || !text) return Promise.resolve();
        
        this.stopSpeaking(); // Ensure any prior speech is stopped

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            this._currentSpeechResolve = () => {
                resolve();
                this._currentSpeechResolve = null;
            };

            const estimatedMs = Math.max(2000, text.length * 80);
            this._currentSpeechTimer = setTimeout(() => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
            }, estimatedMs + 2000);
             const villagerVoice = this.voices.find(v => /David|Google US English|en-US/i.test(v.name)) || this.voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || this.voices[0];
            if (villagerVoice) utterance.voice = villagerVoice;
            
            utterance.pitch = 0.9;
            utterance.rate = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
                if (this._currentSpeechTimer) clearTimeout(this._currentSpeechTimer);
            };
            utterance.onerror = () => {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
                if (this._currentSpeechTimer) clearTimeout(this._currentSpeechTimer);
            };
             try {
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                if (this._currentSpeechResolve) this._currentSpeechResolve();
            }
        });
    }

    shutdown() {
        this.stopSpeaking();
    }

    displayConversationInRightPanel(x, y, width, height) {
        this.rightPanelContainer.removeAll(true);
        
        const dialogue = this.add.text(x, y, `"${this.conversationData.npc_dialogue}"`, {
            fontFamily: 'Inter', fontSize: '24px', color: '#ffffff', fontStyle: 'italic', wordWrap: { width: width - 100 }, lineSpacing: 10
        }).setOrigin(0.5, 0);
        
        this.rightPanelContainer.add(dialogue);
        this.speakText(this.conversationData.npc_dialogue);

        let startY = y + dialogue.getBounds().height + 80;

        this.conversationData.player_suggestions.forEach((suggestion, i) => {
            const btn = this.createSuggestionButton(x, startY + (i * 70), suggestion, width - 100, () => {
                this.getNextDialogue(this.conversationData.villager_id, suggestion);
            });
            this.rightPanelContainer.add(btn);
            btn.setAlpha(0);
            this.tweens.add({ targets: btn, alpha: 1, y: '+=10', duration: 400, delay: i * 100 });
        });
    }

    createSuggestionButton(x, y, text, width, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a1a, 0.9);
        bg.fillRoundedRect(-width/2, -25, width, 50, 12);
        bg.lineStyle(1, 0x2dd4bf, 0.2);
        bg.strokeRoundedRect(-width/2, -25, width, 50, 12);

        const txt = this.add.text(0, 0, text, {
            fontFamily: 'Inter', fontSize: '16px', color: '#2dd4bf', fontWeight: '600'
        }).setOrigin(0.5);

        container.add([bg, txt]);
        container.setSize(width, 50).setInteractive({ useHandCursor: true });
        container.on('pointerdown', callback);
        container.on('pointerover', () => {
            bg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-width/2, -25, width, 50, 12);
            txt.setColor('#000000');
        });
        container.on('pointerout', () => {
            bg.clear().fillStyle(0x1a1a1a, 0.9).fillRoundedRect(-width/2, -25, width, 50, 12);
            txt.setColor('#2dd4bf');
        });
        return container;
    }

    async getNextDialogue(villagerId, playerMessage) {
        this.stopSpeaking();
        this.rightPanelContainer.removeAll(true);

        // Guard: scene may have been stopped before async call returns
        if (!this.scene.isActive()) return;

        const loadingText = this.add.text(
            this.cameras.main.centerX + this.cameras.main.width / 4,
            this.cameras.main.centerY,
            "...",
            { fontSize: '24px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.rightPanelContainer.add(loadingText);

        const nextData = await getConversation(villagerId, playerMessage, this.account);

        // Guard again — scene may have been stopped while waiting for response
        if (!this.scene.isActive() || !this.cameras.main) return;

        if (nextData) {
            this.conversationData = nextData;
            this.displayConversationInRightPanel(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                this.cameras.main.width * 0.9,
                this.cameras.main.height * 0.8
            );
        } else {
            loadingText.setText("I... have nothing more to say.");
        }
    }
}
