'use client';

import Link from 'next/link';
import { styled } from '@mui/material';

export const Footer = () => {
  return (
    <FooterContainer>
      <Links>
        <LinkItem>
          <Link href='https://github.com' target='_blank'>GitHub</Link>
        </LinkItem>
        <VBar>|</VBar>
        <LinkItem>
          <Link href='/'>&copy; {new Date().getFullYear()} ZK-Pay</Link>
        </LinkItem>
      </Links>
    </FooterContainer>
  );
};

const FooterContainer = styled('footer')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: theme.spacing(6),
  marginTop: 'auto',
  zIndex: 10,
}));

const Links = styled('ul')({
  display: 'flex',
  gap: '1.2rem',
  listStyle: 'none',
  padding: 0,
  margin: 0,
});

const LinkItem = styled('li')(({ theme }) => ({
  padding: 0,
  cursor: 'pointer',
  '& a': {
    color: theme.palette.text.primary,
    textDecoration: 'none',
    fontSize: theme.typography.caption.fontSize,
    '&:hover': { fontWeight: 700 },
  },
}));

const VBar = styled('span')(({ theme }) => ({
  color: theme.palette.text.disabled,
}));
