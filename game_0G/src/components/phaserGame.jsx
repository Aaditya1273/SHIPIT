'use client';
import React, { useEffect, useRef, Component } from 'react';
import * as Phaser from 'phaser';
import { WalletScene } from "../scenes/WalletScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { LoadingScene } from "../scenes/LoadingScene.js";
import { HomeScene } from "../scenes/HomeScene.js";
import { LeaderboardScene } from "../scenes/LeaderboardScene.js";
import { DialogueScene } from "../scenes/DialogueScene.js";
import { VideoScene } from "../scenes/VideoScene.js";
import { UIScene } from "../scenes/UIScene.js";
import { ItemLockScene } from "../scenes/ItemLockScene.js";
import { InventoryScene } from "../scenes/InventoryScene.js";
import { EndScene } from "../scenes/EndScene.js";
import { AvatarScene } from '../scenes/AvatarScene.js';
import { HowToScene } from "../scenes/HowToScene.js";

// ── Error Boundary — catches Phaser crashes without killing the whole app ──
class PhaserErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PhaserGame] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', width: '100vw', height: '100vh',
          background: '#050505', color: '#2dd4bf', fontFamily: 'Inter, sans-serif'
        }}>
          <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: '#aaa', marginBottom: '24px', maxWidth: '480px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in the game engine.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px', background: '#2dd4bf', color: '#050505',
              border: 'none', borderRadius: '24px', fontSize: '16px',
              fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            Reload Game
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PhaserGameInner = () => {
    const gameRef = useRef(null);

    useEffect(() => {
        if (gameRef.current) {
            const config = {
                type: Phaser.AUTO,
                parent: 'game-container',
                width: 1280,
                height: 720,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: "arcade",
                    arcade: {
                        gravity: { y: 0 },
                        debug: false,
                    },
                },
                scene: [
                    WalletScene, MenuScene, LoadingScene, VideoScene, HomeScene,
                    UIScene, DialogueScene, InventoryScene, ItemLockScene,
                    LeaderboardScene, EndScene, AvatarScene, HowToScene
                ],
            };

            const game = new Phaser.Game(config);

            // ── Wallet disconnect handler ──────────────────────────────────
            const handleAccountsChanged = (accounts) => {
                if (accounts.length === 0) {
                    // Wallet disconnected — stop game and reload to wallet screen
                    console.warn('[PhaserGame] Wallet disconnected — reloading.');
                    game.destroy(true);
                    localStorage.removeItem('btf_session_active');
                    localStorage.removeItem('btf_active_session_data');
                    window.location.reload();
                }
            };
            if (typeof window !== 'undefined' && window.ethereum) {
                window.ethereum.on('accountsChanged', handleAccountsChanged);
            }

            return () => {
                game.destroy(true);
                if (typeof window !== 'undefined' && window.ethereum) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                }
            };
        }
    }, []);

    return <div id="game-container" ref={gameRef} style={{ width: '100vw', height: '100vh' }} />;
};

const PhaserGame = () => (
    <PhaserErrorBoundary>
        <PhaserGameInner />
    </PhaserErrorBoundary>
);

export default PhaserGame;
