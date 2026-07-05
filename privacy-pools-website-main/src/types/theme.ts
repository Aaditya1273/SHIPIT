import { PaletteOptions, Theme, ThemeOptions } from '@mui/material';

type CustomMuiThemeColors = Partial<PaletteOptions> & {
  border: {
    main: string;
    dark: string;
    light: string;
  };
};
export interface CustomMuiTheme extends Partial<ThemeOptions> {
  dark: CustomMuiThemeColors;
  light: CustomMuiThemeColors;
  borderRadius: {
    default: string;
    sm: string;
    md: string;
    lg: string;
  };
}

export interface CustomThemes {
  getMui: Theme;
}

export type ThemeMode = 'light' | 'dark' | 'system' | undefined;
