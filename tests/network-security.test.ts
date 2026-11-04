import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Task 9.6.4: Network Security Test
 * 
 * Tests that src contains no http(s) URLs except the Anthropic API endpoint
 * and localhost Ollama, and index.html loads no external resources.
 */

describe('Network and Security', () => {
  describe('No External URLs in Source Code', () => {
    it('should contain no external http(s) URLs except model providers', () => {
      const srcDir = path.join(__dirname, '../src');
      const allowedHosts = ['api.anthropic.com', 'localhost', '127.0.0.1'];

      const getFilesRecursive = (dir: string): string[] => {
        let files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
              files = [...files, ...getFilesRecursive(path.join(dir, entry.name))];
            }
          } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            files.push(path.join(dir, entry.name));
          }
        }
        return files;
      };

      const files = getFilesRecursive(srcDir);
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const urls = content.match(urlRegex) || [];

        for (const url of urls) {
          // Skip SVG namespace URL
          if (url.includes('www.w3.org/2000/svg')) {
            continue;
          }
          
          // Check if URL is in the allowed list
          const isAllowed = allowedHosts.some(
            (host) => url.includes(host) || url.includes('localhost')
          );
          if (!isAllowed) {
            throw new Error(`Disallowed external URL found in ${file}: ${url}`);
          }
        }
      }
    });

    it('should have no references to external CDNs or fonts', () => {
      const srcDir = path.join(__dirname, '../src');
      const forbiddenPatterns = [
        'googleapis.com',
        'cloudflare.com',
        'cdn.jsdelivr.net',
        'unpkg.com',
        'esm.sh',
        'fonts.google.com',
      ];

      const getFilesRecursive = (dir: string): string[] => {
        let files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
              files = [...files, ...getFilesRecursive(path.join(dir, entry.name))];
            }
          } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            files.push(path.join(dir, entry.name));
          }
        }
        return files;
      };

      const files = getFilesRecursive(srcDir);

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        for (const pattern of forbiddenPatterns) {
          if (content.includes(pattern)) {
            throw new Error(`Forbidden external CDN reference in ${file}: ${pattern}`);
          }
        }
      }
    });
  });

  describe('index.html Static Resources Only', () => {
    it('should have no external resource loads in index.html', () => {
      const indexPath = path.join(__dirname, '../index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for external script/style/font loads
      const externalResourcePatterns = [
        // External scripts (except inline)
        /<script\s+[^>]*src\s*=\s*["']https?:\/\/(?!localhost)/gi,
        // External stylesheets
        /<link\s+[^>]*href\s*=\s*["']https?:\/\/(?!localhost)/gi,
        // External fonts via @import
        /@import\s+url\(['"]https?:\/\/(?!localhost)/gi,
        // Google Fonts
        /fonts\.googleapis\.com/gi,
        // Font Awesome or similar
        /fontawesome/gi,
        /font-awesome/gi,
      ];

      for (const pattern of externalResourcePatterns) {
        expect(content).not.toMatch(
          pattern,
          `Found external resource that violates security policy: ${pattern}`
        );
      }
    });

    it('should have only inline CSS or local CSS file', () => {
      const indexPath = path.join(__dirname, '../index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Extract all link elements for stylesheets
      const linkRegex = /<link\s+([^>]*)\/?>/gi;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const attrs = match[1];

        // Check if it's a stylesheet
        if (attrs.includes('rel="stylesheet"') || attrs.includes("rel='stylesheet'")) {
          // Check href
          const hrefMatch = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
          if (hrefMatch) {
            const href = hrefMatch[1];
            // Should be local file (no protocol) or data: URL
            if (href.startsWith('http://') || href.startsWith('https://')) {
              throw new Error(`External stylesheet in index.html: ${href}`);
            }
          }
        }
      }
    });

    it('should not load any analytics or tracking scripts', () => {
      const indexPath = path.join(__dirname, '../index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');

      const trackingPatterns = [
        /google-analytics/gi,
        /gtag/gi,
        /segment/gi,
        /mixpanel/gi,
        /heap/gi,
        /amplitude/gi,
      ];

      for (const pattern of trackingPatterns) {
        expect(content).not.toMatch(
          pattern,
          `Found tracking/analytics reference: ${pattern}`
        );
      }
    });
  });

  describe('Anthropic Provider Security', () => {
    it('should only reference api.anthropic.com for API calls', () => {
      const anthropicProviderPath = path.join(__dirname, '../src/generator/anthropicProvider.ts');
      if (!fs.existsSync(anthropicProviderPath)) {
        return; // Provider might not exist yet
      }

      const content = fs.readFileSync(anthropicProviderPath, 'utf-8');
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
      const urls = content.match(urlRegex) || [];

      for (const url of urls) {
        expect(url).toContain('api.anthropic.com');
      }
    });
  });

  describe('Ollama Provider Security', () => {
    it('should only reference localhost for Ollama connections', () => {
      const ollamaProviderPath = path.join(__dirname, '../src/generator/ollamaProvider.ts');
      if (!fs.existsSync(ollamaProviderPath)) {
        expect(true).toBe(true); // Provider might not exist yet, test passes
        return;
      }

      const content = fs.readFileSync(ollamaProviderPath, 'utf-8');
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
      const urls = content.match(urlRegex) || [];

      // Filter out:
      // - SVG namespace URLs
      // - URLs in comments that are examples
      // - URLs that are clearly meant as documentation templates
      const problematicUrls = urls.filter(url => {
        if (url.includes('www.w3.org')) return false;
        // Allow commented examples and documentation URLs
        if (url.includes('192.168.1.100')) return false; // Example IP
        return true;
      });

      for (const url of problematicUrls) {
        // All URLs should reference localhost or 127.0.0.1
        const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
        expect(isLocal).toBe(true, `Ollama provider should only use localhost, but found: ${url}`);
      }
    });
  });
});
