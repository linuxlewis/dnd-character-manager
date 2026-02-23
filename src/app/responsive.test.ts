import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('US-007: Responsive setup and mobile navigation', () => {
  const indexHtml = fs.readFileSync(
    path.resolve(__dirname, 'index.html'),
    'utf-8'
  );
  const themeCss = fs.readFileSync(
    path.resolve(__dirname, 'theme.css'),
    'utf-8'
  );

  it('index.html contains viewport meta tag with width=device-width', () => {
    expect(indexHtml).toContain('name="viewport"');
    expect(indexHtml).toContain('width=device-width');
  });

  it('CSS reset applies box-sizing: border-box globally', () => {
    expect(themeCss).toContain('box-sizing: border-box');
  });

  it('CSS reset includes margin reset', () => {
    expect(themeCss).toMatch(/\*\s*\{[^}]*margin:\s*0/);
  });

  it('CSS reset includes font smoothing', () => {
    expect(themeCss).toContain('-webkit-font-smoothing: antialiased');
    expect(themeCss).toContain('-moz-osx-font-smoothing: grayscale');
  });

  it('interactive elements have minimum 44px touch targets', () => {
    // Check that button, a, and other interactive elements have min-height: 44px
    expect(themeCss).toContain('min-height: 44px');
    expect(themeCss).toContain('min-width: 44px');
  });

  it('back button uses theme tokens for styling', () => {
    expect(themeCss).toContain('.back-button');
    expect(themeCss).toMatch(/\.back-button\s*\{[^}]*var\(--color-primary\)/);
    expect(themeCss).toMatch(/\.back-button\s*\{[^}]*var\(--color-border\)/);
  });

  it('back button hover uses theme tokens', () => {
    expect(themeCss).toContain('.back-button:hover');
    expect(themeCss).toMatch(/\.back-button:hover\s*\{[^}]*var\(--color-surface\)/);
  });

  it('layout has responsive media query for small screens', () => {
    const layoutCss = fs.readFileSync(
      path.resolve(__dirname, 'layout.module.css'),
      'utf-8'
    );
    expect(layoutCss).toContain('@media');
    expect(layoutCss).toContain('max-width: 480px');
  });
});
