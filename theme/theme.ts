// theme.ts
const palette = {
  light: {
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#111111',
    subtext: '#666666',
    primary: '#6200ee',
    border: '#e0e0e0',
  },
  dark: {
    background: '#121212',
    surface: '#1e1e1e',
    text: '#f1f1f1',
    subtext: '#aaaaaa',
    primary: '#bb86fc',
    border: '#333333',
  },
};

export type Theme = typeof palette.light;
export default palette;