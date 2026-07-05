'use client';

import { Container, Typography } from '@mui/material';

export default function GlobalActivityPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Global Activity</Typography>
      <Typography variant='body1' color='text.secondary'>
        Global activity feed coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
}
