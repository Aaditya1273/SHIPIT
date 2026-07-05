'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  Chip,
  Paper,
  Alert,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import { useStellar } from '~/providers/StellarWalletProvider';
import { STELLAR_CONFIG } from '~/config/stellarConfig';

export const Main = () => {
  const {
    connected, publicKey, connect, connectError, checkingFreighter,
  } = useStellar();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch {
      // Error is handled in provider via connectError
    }
  }, [connect]);

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box textAlign='center' mb={5}>
        <Typography variant='h2' fontWeight='bold' gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          ZK-Pay
        </Typography>
        <Typography variant='h5' color='text.secondary' gutterBottom sx={{ mb: 1 }}>
          Zero-Knowledge Privacy Pools on Stellar
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 640, mx: 'auto', mb: 3, lineHeight: 1.6 }}>
          Deposit and withdraw assets anonymously using BLS12-381 Groth16 zk-SNARKs
          verified on Soroban smart contracts. Powered by CAP-0059 on Stellar Protocol 22.
        </Typography>

        {!mounted ? null : !connected ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant='contained'
              size='large'
              onClick={handleConnect}
              disabled={checkingFreighter}
            >
              {checkingFreighter ? 'Connecting...' : 'Connect Freighter Wallet'}
            </Button>
            {connectError && (
              <Alert severity='error' sx={{ maxWidth: 480 }}>
                {connectError}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Chip label={`Connected: ${publicKey?.slice(0, 8)}...${publicKey?.slice(-4)}`} color='success' variant='outlined' />
            <Chip label='Stellar Testnet' color='warning' size='small' variant='outlined' />
          </Box>
        )}
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} mb={4}>
        {[
          { title: 'Contract', value: STELLAR_CONFIG.contractId, mono: true },
          { title: 'Asset', value: `${STELLAR_CONFIG.assetSymbol} (${STELLAR_CONFIG.assetDecimals} decimals)` },
          { title: 'Network', value: `Stellar ${STELLAR_CONFIG.network}` },
        ].map(card => (
          <Grid item xs={12} md={4} key={card.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant='overline' color='text.secondary'>{card.title}</Typography>
                <Typography
                  variant='body2'
                  sx={{ wordBreak: 'break-all', mt: 0.5, fontFamily: card.mono ? 'monospace' : undefined, fontSize: card.mono ? '0.75rem' : undefined }}
                >
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>Deposit</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Make a private deposit into the pool. Generate deposit parameters and submit them on-chain.
              </Typography>
              <Button
                variant='contained'
                component={Link}
                href='/stellar'
                disabled={!connected}
              >
                Go to Deposit
              </Button>
              {!connected && (
                <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 1 }}>
                  Connect your wallet to deposit
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>Withdraw</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Withdraw funds privately using a zero-knowledge proof. Generate a Groth16 proof offline and submit it.
              </Typography>
              <Button
                variant='outlined'
                component={Link}
                href='/stellar'
                disabled={!connected}
              >
                Go to Withdraw
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Demo Quickstart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant='h6' gutterBottom>Quick Start Demo</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box component='ol' sx={{ pl: 2, '& li': { mb: 1 } }}>
          <li><Typography variant='body2'>Install <b>Freighter</b> Chrome extension and set to <b>Testnet</b></Typography></li>
          <li><Typography variant='body2'>Fund your wallet via the <b>Stellar testnet faucet</b></Typography></li>
          <li><Typography variant='body2'>Click <b>&quot;Connect Freighter&quot;</b> above</Typography></li>
          <li><Typography variant='body2'>Navigate to the <b><Link href='/stellar' style={{ color: 'inherit' }}>Stellar Demo</Link></b> page</Typography></li>
          <li><Typography variant='body2'>Follow the stepper: Generate Params → Deposit → Generate Proof → Withdraw</Typography></li>
        </Box>
        <Button variant='text' component={Link} href='/stellar' sx={{ mt: 1 }}>
          Open Full Demo →
        </Button>
      </Paper>
    </Container>
  );
};
