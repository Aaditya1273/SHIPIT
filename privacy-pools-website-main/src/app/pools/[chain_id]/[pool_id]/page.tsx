'use client';

import { Container, Typography } from '@mui/material';
import { useParams } from 'next/navigation';

export default function PoolDetailPage() {
  const params = useParams();
  const chainId = params?.chain_id as string;
  const poolId = params?.pool_id as string;

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' gutterBottom>Pool Details</Typography>
      <Typography variant='body1' color='text.secondary'>
        Pool detail view for chain {chainId} / pool {poolId} coming soon for Stellar.
      </Typography>
    </Container>
  );
}
