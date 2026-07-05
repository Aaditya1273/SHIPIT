'use client';

import { Container, Typography } from '@mui/material';

export const StatsPage = () => {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Pool Statistics</Typography>
      <Typography variant='body1' color='text.secondary'>
        Statistics coming soon for Stellar-based pools.
      </Typography>
    </Container>
  );
};
