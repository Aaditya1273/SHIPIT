'use client';

import type { ReactNode } from 'react';
import { StellarWalletProvider } from './StellarWalletProvider';
import { ThemeProvider } from './ThemeProvider';
import { NotificationProvider } from './NotificationProvider';

type Props = {
  children: ReactNode;
};

export const Providers = ({ children }: Props) => {
  return (
    <ThemeProvider>
      <StellarWalletProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </StellarWalletProvider>
    </ThemeProvider>
  );
};
