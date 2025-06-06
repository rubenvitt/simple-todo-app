import { theme } from 'antd'

// Shared color palette for both Ant Design and Tailwind
export const colorTokens = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  
  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#f0f0f0',
    300: '#d9d9d9',
    400: '#bfbfbf',
    500: '#8c8c8c',
    600: '#595959',
    700: '#434343',
    800: '#262626',
    900: '#1f1f1f',
    950: '#141414',
  },
}

// Ant Design theme configuration
export const antTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: colorTokens.primary,
    colorSuccess: colorTokens.success,
    colorWarning: colorTokens.warning,
    colorError: colorTokens.error,
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Layout tokens
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginLG: 24,
    marginXL: 32,
    
    // Typography
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    
    // Shadows
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}

export const antDarkTheme = {
  ...antTheme,
  algorithm: theme.darkAlgorithm,
}

// CSS custom properties for shared values
export const cssVariables = `
  :root {
    --color-primary: ${colorTokens.primary};
    --color-success: ${colorTokens.success};
    --color-warning: ${colorTokens.warning};
    --color-error: ${colorTokens.error};
    
    --radius-ant: 6px;
    --shadow-ant: 0 2px 8px rgba(0, 0, 0, 0.15);
    --shadow-ant-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    --spacing-xs: 8px;
    --spacing-sm: 12px;
    --spacing: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
  }
  
  .dark {
    --color-bg: #000;
    --color-bg-secondary: #141414;
    --color-text: rgba(255, 255, 255, 0.85);
    --color-text-secondary: rgba(255, 255, 255, 0.65);
  }
  
  .light {
    --color-bg: #fff;
    --color-bg-secondary: #fafafa;
    --color-text: rgba(0, 0, 0, 0.85);
    --color-text-secondary: rgba(0, 0, 0, 0.65);
  }
`