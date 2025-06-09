/**
 * Accessibility utilities for better contrast and usability
 */

/**
 * Calculate the luminance of a color
 * @param hex - Hex color string (e.g., "#ffffff")
 * @returns Luminance value between 0 and 1
 */
export function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.map(x => {
    const val = parseInt(x, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate the contrast ratio between two colors
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the combination meets AA standards
 */
export function meetsWCAGAA(
  foreground: string, 
  background: string, 
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standards
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the combination meets AAA standards
 */
export function meetsWCAGAAA(
  foreground: string, 
  background: string, 
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get a color with better contrast if needed
 * @param foreground - Current foreground color
 * @param background - Background color
 * @param targetRatio - Desired contrast ratio (default: 4.5)
 * @returns Adjusted foreground color or original if already sufficient
 */
export function ensureContrast(
  foreground: string, 
  background: string, 
  targetRatio = 4.5
): string {
  const currentRatio = getContrastRatio(foreground, background);
  
  if (currentRatio >= targetRatio) {
    return foreground;
  }
  
  // If contrast is insufficient, darken or lighten the foreground color
  const backgroundLum = getLuminance(background);
  
  // If background is light, darken the foreground
  // If background is dark, lighten the foreground
  if (backgroundLum > 0.5) {
    return darkenColor(foreground, 0.3);
  } else {
    return lightenColor(foreground, 0.3);
  }
}

/**
 * Darken a hex color by a percentage
 * @param hex - Hex color string
 * @param percent - Percentage to darken (0-1)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb.map(x => Math.round(parseInt(x, 16) * (1 - percent)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Lighten a hex color by a percentage
 * @param hex - Hex color string
 * @param percent - Percentage to lighten (0-1)
 * @returns Lightened hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb.map(x => {
    const val = parseInt(x, 16);
    return Math.round(val + (255 - val) * percent);
  });
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate focus ring styles that meet accessibility standards
 * @param color - Primary color for the focus ring
 * @returns CSS classes for focus ring
 */
export function getFocusRingClasses(color = 'blue'): string {
  return `focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2 focus:outline-none`;
}

/**
 * Check if text size is considered large for WCAG purposes
 * @param fontSize - Font size in pixels
 * @param fontWeight - Font weight (normal, bold, etc.)
 * @returns Whether the text is considered large
 */
export function isLargeText(fontSize: number, fontWeight: string | number = 'normal'): boolean {
  const isBold = typeof fontWeight === 'number' ? fontWeight >= 700 : fontWeight === 'bold';
  return fontSize >= 18 || (fontSize >= 14 && isBold);
}