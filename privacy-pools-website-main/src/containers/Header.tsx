'use client';

import Link from 'next/link';
import { styled } from '@mui/material/styles';
import { Box, Button, Typography, Chip, Tooltip, CircularProgress } from '@mui/material';
import { Logo } from '~/components';
import { useStellar } from '~/providers/StellarWalletProvider';

export const Header = () => {
  const { connected, publicKey, connect, connectError, checkingFreighter } = useStellar();

  return (
    <StyledHeader>
      <Link href='/'>
        <Logo />
      </Link>
      <Actions>
        {connected ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={publicKey || ''}>
              <Chip
                label={`${publicKey?.slice(0, 8)}...${publicKey?.slice(-4)}`}
                color='success'
                size='small'
                variant='outlined'
              />
            </Tooltip>
            <Chip label='Testnet' color='warning' size='small' variant='outlined' />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant='contained'
              onClick={connect}
              disabled={checkingFreighter}
              startIcon={checkingFreighter ? <CircularProgress size={16} /> : undefined}
            >
              {checkingFreighter ? 'Connecting...' : 'Connect Freighter'}
            </Button>
            {connectError && (
              <Typography variant='caption' color='error' sx={{ maxWidth: 220, lineHeight: 1.3 }}>
                {connectError}
              </Typography>
            )}
          </Box>
        )}
      </Actions>
    </StyledHeader>
  );
};

const StyledHeader = styled('header')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '6rem',
  padding: '1.5rem 2rem',
  borderBottom: '1px solid',
  borderColor: theme.palette.grey[900],
  backgroundColor: theme.palette.background.default,
}));

const Actions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});
