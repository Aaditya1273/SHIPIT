'use client';

import { Container, Typography } from '@mui/material';

export default function LoadAccountPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Load Account</Typography>
      <Typography variant='body1' color='text.secondary'>
        Account loading coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
