import { Platform, useColorScheme } from 'react-native';

const light = {
  bg: '#EEF1EE', surface: '#FFFFFF', sunk: '#E3E8E4', ink: '#16201C', muted: '#5B6862', line: '#D3DAD5',
  accent: '#2445C9', accentInk: '#FFFFFF',
  meal: '#B9501A', mealSoft: '#F7E4D8', lift: '#2445C9', liftSoft: '#DFE5FA',
  protein: '#0E7A6A', water: '#2F86D0', gold: '#E0A526', danger: '#B42318',
};
const dark: typeof light = {
  bg: '#0F1412', surface: '#182019', sunk: '#121915', ink: '#E6ECE8', muted: '#93A099', line: '#29332E',
  accent: '#8099FF', accentInk: '#0B1020',
  meal: '#F08C52', mealSoft: '#3A2418', lift: '#8099FF', liftSoft: '#1C2444',
  protein: '#3CC4AF', water: '#6CB8F2', gold: '#E6C05A', danger: '#FF7A6E',
};
export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Fonts built into the phone, so nothing needs downloading */
const ios = Platform.OS === 'ios';
export const F = {
  display: ios ? 'AvenirNextCondensed-Heavy' : 'sans-serif-condensed',
  displayBlack: ios ? 'AvenirNextCondensed-Heavy' : 'sans-serif-condensed',
  body: ios ? 'AvenirNext-Regular' : 'sans-serif',
  bodySemi: ios ? 'AvenirNext-DemiBold' : 'sans-serif-medium',
  bodyBold: ios ? 'AvenirNext-Bold' : 'sans-serif-medium',
  mono: ios ? 'Menlo-Regular' : 'monospace',
  monoSemi: ios ? 'Menlo-Bold' : 'monospace',
};
