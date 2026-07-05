'use client';

import { Container, Typography } from '@mui/material';

export default function PersonalActivityPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Personal Activity</Typography>
      <Typography variant='body1' color='text.secondary'>
        Activity tracking coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
