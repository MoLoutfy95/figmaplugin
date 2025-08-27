// Figma Plugin Main Code
figma.showUI(__html__, { 
  width: 380, 
  height: 650,
  themeColors: true 
});

// Extract design tokens from Figma
function extractDesignTokens() {
  const tokens: any = {
    colors: {},
    spacing: {},
    typography: {},
    effects: {},
    radius: {}
  };

  try {
    // Extract Colors from Paint Styles
    const paintStyles = figma.getLocalPaintStyles();
    const lightColors: any = {};
    const darkColors: any = {};
    
    paintStyles.forEach(style => {
      try {
        const paint = style.paints[0];
        if (paint && paint.type === 'SOLID') {
          const rgb = paint.color;
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          const tokenName = style.name.replace(/\s+/g, '').replace(/\//g, '').replace(/[^a-zA-Z0-9]/g, '');
          if (tokenName) {
            // Check if it's a light/dark variant
            const styleName = style.name.toLowerCase();
            if (styleName.includes('light') || styleName.includes('/light')) {
              const baseTokenName = tokenName.replace(/light/gi, '').replace(/Light/gi, '');
              lightColors[baseTokenName] = hex;
            } else if (styleName.includes('dark') || styleName.includes('/dark')) {
              const baseTokenName = tokenName.replace(/dark/gi, '').replace(/Dark/gi, '');
              darkColors[baseTokenName] = hex;
            } else {
              // Regular color token
              tokens.colors[tokenName] = {
                value: hex,
                type: 'color',
                name: style.name
              };
            }
          }
        }
      } catch (error) {
        console.log('Error processing paint style:', style.name);
      }
    });

    // Combine light and dark colors into themed tokens
    const combinedTokenNames = new Set([...Object.keys(lightColors), ...Object.keys(darkColors)]);
    combinedTokenNames.forEach(tokenName => {
      if (lightColors[tokenName] && darkColors[tokenName]) {
        tokens.colors[tokenName] = {
          light: lightColors[tokenName],
          dark: darkColors[tokenName],
          type: 'themedColor',
          name: tokenName
        };
      } else if (lightColors[tokenName]) {
        tokens.colors[tokenName] = {
          value: lightColors[tokenName],
          type: 'color',
          name: tokenName + ' (Light)'
        };
      } else if (darkColors[tokenName]) {
        tokens.colors[tokenName] = {
          value: darkColors[tokenName],
          type: 'color',
          name: tokenName + ' (Dark)'
        };
      }
    });

    // Extract Typography from Text Styles
    const textStyles = figma.getLocalTextStyles();
    textStyles.forEach(style => {
      try {
        const tokenName = style.name.replace(/\s+/g, '').replace(/\//g, '').replace(/[^a-zA-Z0-9]/g, '');
        if (tokenName) {
          tokens.typography[tokenName] = {
            fontFamily: { value: style.fontName.family, type: 'fontFamily' },
            fontWeight: { value: style.fontName.style, type: 'fontWeight' },
            fontSize: { value: style.fontSize, type: 'fontSize' },
            lineHeight: { value: style.lineHeight, type: 'lineHeight' },
            letterSpacing: { value: style.letterSpacing, type: 'letterSpacing' },
            name: style.name
          };
        }
      } catch (error) {
        console.log('Error processing text style:', style.name);
      }
    });

    // Extract Effects (Shadows)
    const effectStyles = figma.getLocalEffectStyles();
    effectStyles.forEach(style => {
      try {
        const tokenName = style.name.replace(/\s+/g, '').replace(/\//g, '').replace(/[^a-zA-Z0-9]/g, '');
        const effect = style.effects[0];
        if (effect && effect.type === 'DROP_SHADOW' && tokenName) {
          tokens.effects[tokenName] = {
            x: { value: effect.offset.x, type: 'dimension' },
            y: { value: effect.offset.y, type: 'dimension' },
            blur: { value: effect.radius, type: 'dimension' },
            spread: { value: effect.spread || 0, type: 'dimension' },
            color: { value: rgbToHex(effect.color.r, effect.color.g, effect.color.b), type: 'color' },
            opacity: { value: effect.color.a, type: 'opacity' },
            name: style.name
          };
        }
      } catch (error) {
        console.log('Error processing effect style:', style.name);
      }
    });

    // Extract spacing values from selected frames/components
    const selection = figma.currentPage.selection;
    const spacingValues = new Set<number>();
    
    selection.forEach(node => {
      try {
        if ('paddingLeft' in node) {
          if (typeof node.paddingLeft === 'number') spacingValues.add(node.paddingLeft);
          if (typeof node.paddingRight === 'number') spacingValues.add(node.paddingRight);
          if (typeof node.paddingTop === 'number') spacingValues.add(node.paddingTop);
          if (typeof node.paddingBottom === 'number') spacingValues.add(node.paddingBottom);
        }
        if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
          spacingValues.add(node.itemSpacing);
        }
      } catch (error) {
        console.log('Error processing node spacing');
      }
    });

    // Convert spacing values to tokens
    const sortedSpacing = Array.from(spacingValues).filter(v => v > 0).sort((a, b) => a - b);
    const spacingSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    sortedSpacing.forEach((value, index) => {
      if (index < spacingSizes.length) {
        tokens.spacing[`spacing${spacingSizes[index].toUpperCase()}`] = {
          value: value,
          type: 'spacing'
        };
      }
    });

    // Extract corner radius from selected nodes
    const radiusValues = new Set<number>();
    selection.forEach(node => {
      try {
        if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
          radiusValues.add(node.cornerRadius);
        }
      } catch (error) {
        console.log('Error processing node radius');
      }
    });

    const sortedRadius = Array.from(radiusValues).filter(v => v > 0).sort((a, b) => a - b);
    sortedRadius.forEach((value, index) => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
      if (index < sizes.length) {
        tokens.radius[`radius${sizes[index].toUpperCase()}`] = {
          value: value,
          type: 'radius'
        };
      }
    });

    // Add default values if no tokens found
    if (Object.keys(tokens.colors).length === 0) {
      tokens.colors.primary = { value: '#007AFF', type: 'color' };
      tokens.colors.secondary = { value: '#5856D6', type: 'color' };
    }

    if (Object.keys(tokens.spacing).length === 0) {
      tokens.spacing.spacingXS = { value: 4, type: 'spacing' };
      tokens.spacing.spacingSM = { value: 8, type: 'spacing' };
      tokens.spacing.spacingMD = { value: 16, type: 'spacing' };
      tokens.spacing.spacingLG = { value: 24, type: 'spacing' };
    }

  } catch (error) {
    console.log('Error extracting tokens:', error);
  }

  return tokens;
}

// Helper function to convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Listen for messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'extract-tokens') {
    try {
      const tokens = extractDesignTokens();
      figma.ui.postMessage({
        type: 'tokens-extracted',
        tokens: tokens
      });
    } catch (error) {
      figma.notify('Error extracting tokens. Please try again.');
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to extract tokens'
      });
    }
  }

  if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }
};