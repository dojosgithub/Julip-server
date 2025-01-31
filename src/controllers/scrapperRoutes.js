const puppeteer = require('puppeteer')

// * Libraries
import { StatusCodes } from 'http-status-codes'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { User, Group, Challenge, Profile } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const createBrowser = async () => {
  // Check if running on Heroku (process.env.DYNO is set on Heroku)
  const isHeroku = process.env.DYNO

  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920x1080',
      // Additional args for Heroku
      isHeroku ? '--disable-software-rasterizer' : null,
      isHeroku ? '--disable-extensions' : null,
    ].filter(Boolean), // Remove null values
    // Specify executable path for Heroku
    executablePath: isHeroku ? process.env.PUPPETEER_EXECUTABLE_PATH : null,
  })
}

export const CONTROLLER_SCRAPE = {
  scrapeAmazon: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    if (!url) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'URL is required.',
      })
    }

    try {
      const browser = await createBrowser()
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      const productData = await page.evaluate(() => {
        const title = document.querySelector('#productTitle')?.innerText.trim()
        const price = document.querySelector('.a-price .a-offscreen')?.innerText.trim()
        const rating = document.querySelector('.a-icon-alt')?.innerText.trim()
        const image = document.querySelector('#imgTagWrapperId img')?.src
        const brand =
          document
            .querySelector('#bylineInfo')
            ?.innerText.trim()
            .replace('Brand: ', '')
            .replace('Visit the ', '')
            .replace(' Store', '') ||
          document.querySelector('#brand')?.innerText.trim() ||
          document.querySelector('.po-brand .a-span9')?.innerText.trim() ||
          document.querySelector('tr.po-brand td.a-span9')?.innerText.trim() ||
          document.querySelector('[data-cel-widget="bylineInfo"]')?.innerText.trim().replace('Brand: ', '') ||
          null

        // Selector for description (may vary, so handle fallback)
        const description =
          document.querySelector('#productDescription p')?.innerText.trim() ||
          Array.from(document.querySelectorAll('#feature-bullets ul li span'))
            .map((el) => el.innerText.trim())
            .join(' ')

        return { title, price, rating, image, brand, description }
      })

      await browser.close()
      res.status(StatusCodes.OK).json({
        data: productData,
        message: 'Amazon product data fetched successfully.',
      })
    } catch (error) {
      console.error('Error scraping Amazon:', error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error scraping Amazon.',
      })
    }
  }),

  scrapeWalmart: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    if (!url) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'URL is required.',
      })
    }

    try {
      const browser = await createBrowser()

      const page = await browser.newPage()

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait for price element to be visible
      await page
        .waitForSelector('[data-automation="buybox-price"]', { timeout: 5000 })
        .catch(() => console.log('Price selector timeout'))

      const productData = await page.evaluate(() => {
        // Brand - multiple possible selectors
        const brand =
          document.querySelector('.b-product_details-brand a')?.innerText?.trim() ||
          document.querySelector('.b-product_details-brand span')?.innerText?.trim() ||
          document.querySelector('[itemprop="brand"]')?.innerText?.trim() ||
          document.querySelector('[data-automation="product-brand"]')?.innerText?.trim() ||
          document.querySelector('.prod-brandName')?.innerText?.trim() ||
          document.querySelector('.brand-name')?.innerText?.trim() ||
          // Try finding brand within product title
          (document.querySelector('h1')?.innerText || '').split(' ')[0] ||
          // Try finding any element containing "Brand:" text
          Array.from(document.querySelectorAll('*'))
            .find((el) => el.innerText?.includes('Brand:'))
            ?.innerText?.split('Brand:')[1]
            ?.trim()

        // Debug: Log all potential brand elements
        console.log('Brand Elements:', {
          brandLink: document.querySelector('.b-product_details-brand a')?.innerText,
          brandSpan: document.querySelector('.b-product_details-brand span')?.innerText,
          brandItemprop: document.querySelector('[itemprop="brand"]')?.innerText,
          brandAutomation: document.querySelector('[data-automation="product-brand"]')?.innerText,
          prodBrandName: document.querySelector('.prod-brandName')?.innerText,
        })

        // Title
        const title =
          document.querySelector('[itemprop="name"]')?.innerText?.trim() ||
          document.querySelector('h1')?.innerText?.trim()

        // Description - multiple possible selectors
        const description =
          document.querySelector('[itemprop="description"]')?.innerText?.trim() ||
          document.querySelector('#product-overview')?.innerText?.trim() ||
          document.querySelector('.product-description-content')?.innerText?.trim()

        // Price - updated selectors
        const priceElement = document.querySelector('[data-automation="buybox-price"]')
        const price = priceElement ? priceElement.innerText.trim() : null

        // Alternative price selectors if the above fails
        const altPrice =
          price ||
          document.querySelector('.price-characteristic')?.innerText?.trim() ||
          document.querySelector('[data-testid="price-value"]')?.innerText?.trim() ||
          document.querySelector('span[itemprop="price"]')?.innerText?.trim()

        // Image
        const image =
          document.querySelector('[data-testid="hero-image"]')?.src ||
          document.querySelector('[property="og:image"]')?.getAttribute('content')

        return {
          brand: brand || null,
          title: title || null,
          description: description || null,
          price: altPrice || null,
          image: image || null,
        }
      })

      await browser.close()

      // Debug logging
      console.log('Scraped Data:', productData)

      // Validate that we got some data
      if (!productData.title && !productData.price) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Failed to extract product data. The page structure might have changed.',
        })
      }

      res.status(StatusCodes.OK).json({
        data: productData,
        message: 'Walmart product data fetched successfully.',
      })
    } catch (error) {
      console.error('Error scraping Walmart:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error scraping Walmart: ' + error.message,
      })
    }
  }),
  scrapeShopify: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    if (!url) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'URL is required.',
      })
    }

    try {
      const browser = await createBrowser()

      const page = await browser.newPage()

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // First, verify if it's a Shopify site
      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait longer for dynamic content
      await page.waitForTimeout(5000)

      const productData = await page.evaluate(() => {
        // Enhanced title selectors
        const titleSelectors = [
          'h1',
          '.product-single__title',
          '.product-title',
          '[itemprop="name"]',
          '.product__title',
          '.product_title',
          '.product_name',
          '#productTitle',
          '.title-main',
          '[data-product-title]',
        ]

        const title = titleSelectors
          .map((selector) => document.querySelector(selector)?.innerText?.trim())
          .find((title) => title)

        // Enhanced price selectors
        const priceSelectors = [
          '.price-item--regular',
          '.product-single__price',
          '.product__price',
          '[itemprop="price"]',
          '.price',
          '.product-price',
          'span[data-regular-price]',
          '.price__regular',
          '.product__current-price',
          '[data-product-price]',
          '.money',
        ]

        const price = priceSelectors
          .map((selector) => document.querySelector(selector)?.innerText?.trim())
          .find((price) => price)

        // Enhanced image selectors
        const imageSelectors = [
          '[itemprop="image"]',
          '.product-single__photo img',
          '.product__image',
          '.product-featured-img',
          '[data-product-featured-image]',
          '.product-featured-image',
          '#ProductPhotoImg',
          '[data-zoom-image]',
          '.product_image',
          '.featured-image',
        ]

        const image = imageSelectors.map((selector) => document.querySelector(selector)?.src).find((img) => img)

        // Debug info
        const debugInfo = {
          foundTitleSelectors: titleSelectors
            .filter((selector) => document.querySelector(selector))
            .map((selector) => ({
              selector,
              text: document.querySelector(selector)?.innerText,
            })),
          foundPriceSelectors: priceSelectors
            .filter((selector) => document.querySelector(selector))
            .map((selector) => ({
              selector,
              text: document.querySelector(selector)?.innerText,
            })),
          foundImageSelectors: imageSelectors
            .filter((selector) => document.querySelector(selector))
            .map((selector) => ({
              selector,
              src: document.querySelector(selector)?.src,
            })),
        }

        return {
          title: title || null,
          price: price || null,
          image: image || null,
          debug: debugInfo,
        }
      })

      await browser.close()

      // Modified validation
      if (!productData.title && !productData.price) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Failed to extract product data. Debug info:',
          debug: productData.debug,
        })
      }

      delete productData.debug // Remove debug info from final response
      res.status(StatusCodes.OK).json({
        data: productData,
        message: 'Shopify product data fetched successfully.',
      })
    } catch (error) {
      console.error('Error scraping Shopify:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error scraping Shopify: ' + error.message,
      })
    }
  }),

  webCrawler: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    try {
      // const response = await axios.get('https://app.scrapingbee.com/api/v1', {
      //   params: {
      //     api_key: 'MTBXWDECZTSZDXNFUTR8ILAOFU5TNL3VOZNHCV06XOP310QP5UYY8E5ARAENKYOI405PRJMUM9WVKNHK',
      //     url,
      //     extract_rules: JSON.stringify({
      //       title: 'h1',
      //       price: '.price, .product-price, [itemprop="price"]',
      //       description: '.description, .product-description, [itemprop="description"]',
      //       brand: '.brand, [itemprop="brand"], .product-brand',
      //     }),
      //   },
      // })

      const response = await axios.get('https://api.diffbot.com/v3/product', {
        params: {
          token: '07d76447f1815e9c5f6adee4e7558574',
          url: url, // URL of the product page
        },
      })
      // Extract relevant fields from the Diffbot response
      const productData = response?.data?.objects[0] // Diffbot returns data in `objects` array
      console.log('response.data', response.data)
      const extractedData = {
        title: productData.title || null,
        price: productData.offerPrice || productData.price || null, // Use `offerPrice` or `price`
        brand: productData.brand || null,
        image: productData.images ? productData.images[0]?.url : null, // Use the first image URL
        description: productData.description || null,
      }

      res.status(StatusCodes.OK).json({
        data: extractedData,
        message: 'Product data fetched successfully.',
      })
    } catch (error) {
      console.error('Error scraping:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error scraping: ' + error.message,
      })
    }
  }),
}
