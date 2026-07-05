'use client';

import { Container, Typography } from '@mui/material';

export default function PoolAccountsPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Pool Accounts</Typography>
      <Typography variant='body1' color='text.secondary'>
        Pool account management coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
