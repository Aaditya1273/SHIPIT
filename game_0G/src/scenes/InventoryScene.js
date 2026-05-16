import * as Phaser from "phaser";

export class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "InventoryScene" });
        this.inventory = [];
    }

    init(data) {
        const homeScene = this.scene.get('HomeScene');
        this.inventory = homeScene?.playerInventory ? Array.from(homeScene.playerInventory) : (data.inventory || []);
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Darkened backdrop with blur effect
        this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive();

        const panelWidth = 800;
        const panelHeight = 550;
        const px = width / 2;
        const py = height / 2;

        // Premium Glass Panel
        const graphics = this.add.graphics();
        graphics.fillStyle(0x0a0a0a, 0.95);
        graphics.fillRoundedRect(px - panelWidth / 2, py - panelHeight / 2, panelWidth, panelHeight, 24);
        graphics.lineStyle(2, 0x2dd4bf, 0.4);
        graphics.strokeRoundedRect(px - panelWidth / 2, py - panelHeight / 2, panelWidth, panelHeight, 24);
        
        // Header
        this.add.text(px, py - panelHeight / 2 + 50, 'COLLECTED ARTIFACTS', {
            fontFamily: 'Cinzel', fontSize: '32px', color: '#2dd4bf', letterSpacing: 6, fontStyle: 'bold'
        }).setOrigin(0.5);

        const subheader = this.add.text(px, py - panelHeight / 2 + 90, `${this.inventory.length} / 11 Items Recovered`, {
            fontFamily: 'Inter', fontSize: '14px', color: '#666666', letterSpacing: 2
        }).setOrigin(0.5);

        // Grid Settings
        const cols = 4;
        const cellWidth = 160;
        const cellHeight = 100;
        const startX = px - (cols * cellWidth) / 2 + cellWidth / 2;
        const startY = py - 80;

        const ALL_ITEMS = [
            "RUSTY_KEY", "FOG_LANTERN", "ANCIENT_MAP", "AXE", 
            "FISHING_ROD", "SHOVEL", "LANTERN", "PICKAXE", 
            "HAMMER", "BUCKET", "SCYTHE"
        ];
        const ownedItems = new Set(this.inventory);

        ALL_ITEMS.forEach((item, index) => {
            const isOwned = ownedItems.has(item);
            const r = Math.floor(index / cols);
            const c = index % cols;
            const x = startX + c * cellWidth;
            const y = startY + r * cellHeight;

            // Slot Background
            const slot = this.add.graphics();
            slot.fillStyle(isOwned ? 0x1a1a1a : 0x0d0d0d, 1);
            slot.fillRoundedRect(x - 70, y - 40, 140, 80, 12);
            slot.lineStyle(1, isOwned ? 0x2dd4bf : 0x333333, isOwned ? 0.6 : 0.3);
            slot.strokeRoundedRect(x - 70, y - 40, 140, 80, 12);

            // Item Name
            this.add.text(x, y, item.replace(/_/g, ' '), {
                fontFamily: 'Inter',
                fontSize: '12px',
                color: isOwned ? '#ffffff' : '#444444',
                fontWeight: isOwned ? '700' : '400',
                align: 'center',
                wordWrap: { width: 120 }
            }).setOrigin(0.5);

            if (isOwned) {
                this.add.text(x + 55, y - 30, '✓', { fontSize: '14px', color: '#2dd4bf' }).setOrigin(0.5);
            }
        });

        // Close Button (Stripe style)
        const closeBtn = this.add.container(px, py + panelHeight / 2 - 60);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2dd4bf, 1);
        btnBg.fillRoundedRect(-100, -25, 200, 50, 12);
        const btnText = this.add.text(0, 0, 'RESUME JOURNEY', {
            fontFamily: 'Inter', fontSize: '14px', color: '#000000', fontWeight: '900', letterSpacing: 1
        }).setOrigin(0.5);
        
        closeBtn.add([btnBg, btnText]);
        closeBtn.setSize(200, 50).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            this.scene.resume('HomeScene');
            this.scene.stop();
        });
        closeBtn.on('pointerover', () => btnBg.clear().fillStyle(0xffffff, 1).fillRoundedRect(-100, -25, 200, 50, 12));
        closeBtn.on('pointerout', () => btnBg.clear().fillStyle(0x2dd4bf, 1).fillRoundedRect(-100, -25, 200, 50, 12));

        // Close with Escape key
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.resume('HomeScene');
            this.scene.stop();
        });
    }
}