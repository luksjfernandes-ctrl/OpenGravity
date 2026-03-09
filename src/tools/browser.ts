import { chromium, Browser, Page } from 'playwright-core';

let browser: Browser | null = null;
let page: Page | null = null;

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

async function getPage(): Promise<Page> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process'
      ]
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    page = await context.newPage();
  }
  if (!page || page.isClosed()) {
    const context = browser.contexts()[0] || await browser.newContext();
    page = await context.newPage();
  }
  return page;
}

async function getSnapshot(p: Page): Promise<string> {
  const title = await p.title();
  const url = p.url();
  
  // Get text content, truncated to fit LLM context
  const text = await p.evaluate(() => {
    // Remove scripts, styles, and hidden elements
    const remove = document.querySelectorAll('script, style, noscript, [aria-hidden="true"]');
    remove.forEach(el => el.remove());
    return document.body?.innerText || '';
  }).catch(() => '');

  const truncated = text.substring(0, 6000);
  return `📄 Title: ${title}\n🔗 URL: ${url}\n\n${truncated}${text.length > 6000 ? '\n\n[... conteúdo truncado ...]' : ''}`;
}

async function closeBrowser(): Promise<void> {
  if (page && !page.isClosed()) await page.close().catch(() => {});
  if (browser && browser.isConnected()) await browser.close().catch(() => {});
  browser = null;
  page = null;
}

// ── Tool: browse_url ──
export const browseUrlTool = {
  name: 'browse_url',
  description: 'Navega para uma URL e retorna o conteúdo de texto da página. Use para ler páginas web, artigos, resultados de pesquisa, etc.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL completa para navegar (ex: https://example.com)'
      }
    },
    required: ['url']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const p = await getPage();
      await p.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForTimeout(1000); // Wait for dynamic content
      return await getSnapshot(p);
    } catch (err: any) {
      return `Erro ao navegar para ${args.url}: ${err.message}`;
    }
  }
};

// ── Tool: browser_click ──
export const browserClickTool = {
  name: 'browser_click',
  description: 'Clica em um elemento na página atual do navegador. Use após browse_url para interagir com a página.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'Seletor CSS ou texto visível do elemento para clicar (ex: "button.submit", "Entrar", "a:has-text(\'Login\')")'
      }
    },
    required: ['selector']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const p = await getPage();
      // Try CSS selector first, then text
      try {
        await p.click(args.selector, { timeout: 5000 });
      } catch {
        await p.getByText(args.selector, { exact: false }).first().click({ timeout: 5000 });
      }
      await p.waitForTimeout(1500);
      return await getSnapshot(p);
    } catch (err: any) {
      return `Erro ao clicar em "${args.selector}": ${err.message}`;
    }
  }
};

// ── Tool: browser_type ──
export const browserTypeTool = {
  name: 'browser_type',
  description: 'Digita texto em um campo de input na página atual. Use após browse_url.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'Seletor CSS do campo de input (ex: "input[name=search]", "#email", "textarea")'
      },
      text: {
        type: 'string',
        description: 'Texto a digitar no campo'
      },
      submit: {
        type: 'boolean',
        description: 'Se true, pressiona Enter após digitar (submeter formulário)'
      }
    },
    required: ['selector', 'text']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const p = await getPage();
      await p.fill(args.selector, args.text, { timeout: 5000 });
      if (args.submit) {
        await p.press(args.selector, 'Enter');
        await p.waitForTimeout(2000);
      }
      return await getSnapshot(p);
    } catch (err: any) {
      return `Erro ao digitar em "${args.selector}": ${err.message}`;
    }
  }
};

// ── Tool: browser_snapshot ──
export const browserSnapshotTool = {
  name: 'browser_snapshot',
  description: 'Captura o conteúdo de texto atual da página aberta no navegador. Use para re-ler a página após uma interação.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (): Promise<string> => {
    try {
      const p = await getPage();
      return await getSnapshot(p);
    } catch (err: any) {
      return `Erro ao capturar snapshot: ${err.message}`;
    }
  }
};

// ── Tool: browser_close ──
export const browserCloseTool = {
  name: 'browser_close',
  description: 'Fecha o navegador. Use quando terminar de navegar para liberar recursos.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (): Promise<string> => {
    await closeBrowser();
    return 'Navegador fechado.';
  }
};
