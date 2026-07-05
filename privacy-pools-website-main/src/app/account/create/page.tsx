'use client';

import { Container, Typography } from '@mui/material';

export default function CreateAccountPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Create Account</Typography>
      <Typography variant='body1' color='text.secondary'>
        Account creation coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
