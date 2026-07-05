'use client';

import { CssBaseline, GlobalStyles, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { getConfig } from '~/config';
import { HEADER_HEIGHT } from '~/utils';
import type { ReactNode } from 'react';

interface StateProps {
  children: ReactNode;
}

export const defaultMode = 'light';

export const ThemeProvider = ({ children }: StateProps) => {
  const muiTheme = getConfig().customThemes.getMui;

  return (
    <MuiThemeProvider theme={muiTheme} defaultMode={defaultMode} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      <GlobalStyles
        styles={{
          'html.light body, html.dark body': {
            '--wcm-z-index': '400', // wallet connect modal z-index
          },
          body: {
            '--header-height': HEADER_HEIGHT.default + 'rem',
          },
        }}
      />
      {children}
    </MuiThemeProvider>
  );
};
