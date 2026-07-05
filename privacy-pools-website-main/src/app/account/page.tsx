'use client';

import { Container, Typography } from '@mui/material';

export default function AccountPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Account</Typography>
      <Typography variant='body1' color='text.secondary'>
        Account management coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
