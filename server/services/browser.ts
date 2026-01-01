import { chromium, Browser, BrowserContext } from 'playwright'

let browser: Browser | null = null
let launching = false

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser
  }

  if (launching) {
    // Wait for existing launch to complete
    while (launching) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (browser && browser.isConnected()) {
      return browser
    }
  }

  launching = true
  try {
    console.log('Launching browser...')
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    })
    console.log('Browser ready')
    return browser
  } finally {
    launching = false
  }
}

export async function createContext(): Promise<BrowserContext> {
  const b = await getBrowser()
  return b.newContext({
    viewport: { width: 1920, height: 1080 },
  })
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
    console.log('Browser closed')
  }
}

export function getBrowserStatus(): 'ready' | 'launching' | 'error' {
  if (launching) return 'launching'
  if (browser && browser.isConnected()) return 'ready'
  return 'error'
}
