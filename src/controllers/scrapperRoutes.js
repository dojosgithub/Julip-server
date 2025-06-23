const puppeteer = require('puppeteer')

// * Libraries
import { StatusCodes } from 'http-status-codes'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import dotenv from 'dotenv'
const { ZenRows } = require('zenrows')
dotenv.config()

// * Models
import { User, Group, Challenge, Profile } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'
import { currencySymbols, extractWithFallbacks } from '../utils/helper'

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

      const productData = await scrapeWalmartData(url)

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

  // webCrawler: asyncMiddleware(async (req, res) => {
  //   const { url } = req.body
  //   try {
  //     // const response = await axios.get('https://app.scrapingbee.com/api/v1', {
  //     //   params: {
  //     //     api_key: 'MTBXWDECZTSZDXNFUTR8ILAOFU5TNL3VOZNHCV06XOP310QP5UYY8E5ARAENKYOI405PRJMUM9WVKNHK',
  //     //     url,
  //     //     extract_rules: JSON.stringify({
  //     //       title: 'h1',
  //     //       price: '.price, .product-price, [itemprop="price"]',
  //     //       description: '.description, .product-description, [itemprop="description"]',
  //     //       brand: '.brand, [itemprop="brand"], .product-brand',
  //     //     }),
  //     //   },
  //     // })

  // const response = await axios.get('https://api.diffbot.com/v3/product', {
  //   params: {
  //     token: 'e27411d975d8692c44ba04748233a7fd',
  //     url: url, // URL of the product page
  //   },
  // })
  // // Extract relevant fields from the Diffbot response
  // const productData = response?.data?.objects[0] // Diffbot returns data in `objects` array
  // console.log('response.data', response.data)
  // const extractedData = {
  //   title: productData.title || null,
  //   price: productData.offerPrice || productData.price || null, // Use `offerPrice` or `price`
  //   brand: productData.brand || null,
  //   image: productData.images ? productData.images[0]?.url : null, // Use the first image URL
  //   description: productData.description || null,
  // }

  //     res.status(StatusCodes.OK).json({
  //       data: extractedData,
  //       message: 'Product data fetched successfully.',
  //     })
  //   } catch (error) {
  //     console.error('Error scraping:', error)
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'Error scraping: ' + error.message,
  //     })
  //   }
  // }),

  webCrawler: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    try {
      if (url.includes('chewy.com')) {
        const client = new ZenRows('1a4b70cef75946e38721336fa7c116ed1a892c0e')

        const request = await client.get(url, {
          js_render: 'true',
          premium_proxy: 'true',
        })

        const data = await request.text() // Get the raw HTML response
        console.log('Raw HTML received')

        // Parse the HTML with cheerio
        const cheerio = require('cheerio')
        const $ = cheerio.load(data)

        // Try to extract data from JSON-LD first (most reliable)
        let extractedData = {}

        try {
          // Find the JSON-LD script tag
          const jsonLdText = $('script[type="application/ld+json"]').html()

          if (jsonLdText) {
            // Parse the JSON content
            const jsonData = JSON.parse(jsonLdText)

            // Extract the product data
            extractedData = {
              title: jsonData.name || null,
              price: null,
              brand: jsonData.brand?.name || jsonData.hasVariant?.[0]?.seller?.name || jsonData.seller?.name || null,
              image: jsonData.image || null,
              description: jsonData.description || null,
            }
            console.log('jsonData', jsonData)
            // Extract price from the first variant if available
            if (Array.isArray(jsonData.offers)) {
              const offer = jsonData.offers[0]
              const symbol = currencySymbols[offer?.priceCurrency] || offer?.priceCurrency || ''
              if (offer?.price) {
                extractedData.price = `${symbol}${offer.price}`
              }
            } else if (jsonData.offers?.price) {
              const currency = jsonData.offers?.priceCurrency
              const symbol = currencySymbols[currency] || currency || ''
              extractedData.price = currency ? `${symbol}${jsonData.offers.price}` : `${jsonData.offers.price}`
            }
          }
        } catch (jsonError) {
          console.error('Error extracting from JSON-LD:', jsonError)
          // Continue to fallback methods if JSON-LD extraction fails
        }

        extractedData = extractWithFallbacks($, extractedData)
        // Log the extracted data for debugging
        console.log('Extracted data:', extractedData)

        res.status(StatusCodes.OK).json({
          data: extractedData,
          message: 'Product data fetched successfully.(ZenRows)',
        })
      } else if (url.includes('walmart.com')) {
        const productData = await scrapeWalmartData(url)
        return res.status(StatusCodes.OK).json({
          data: productData,
          message: 'Walmart product data fetched successfully.',
        })
      } else {
        // Default: Use Diffbot
        const response = await axios.get('https://api.diffbot.com/v3/product', {
          params: {
            token: 'e27411d975d8692c44ba04748233a7fd',
            url: url,
          },
        })

        const productData = response?.data?.objects[0]
        console.log('productData', productData)
        const extractedData = {
          title: productData?.title || null,
          price: productData?.offerPrice || productData?.price || null,
          brand: productData?.brand || null,
          image: productData?.images?.[0]?.url || null,
          description: productData?.description || null,
        }

        res.status(StatusCodes.OK).json({
          data: extractedData,
          message: 'Product data fetched from Diffbot.',
        })
      }
    } catch (error) {
      console.error('Error scraping:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error scraping: ' + error.message,
      })
    }
  }),
  //----------------------------------------------------------------------------------------------------
  // webCrawler: asyncMiddleware(async (req, res) => {
  //   // Helper function to detect site type
  //   function detectSiteType(hostname) {
  //     if (hostname.includes('amazon')) return 'amazon'
  //     if (hostname.includes('flipkart')) return 'flipkart'
  //     if (hostname.includes('chewy')) return 'chewy'
  //     if (hostname.includes('walmart')) return 'walmart'
  //     if (hostname.includes('bestbuy')) return 'bestbuy'
  //     if (hostname.includes('target')) return 'target'
  //     if (hostname.includes('ebay')) return 'ebay'
  //     if (hostname.includes('etsy')) return 'etsy'
  //     if (hostname.includes('newegg')) return 'newegg'
  //     if (hostname.includes('homedepot')) return 'homedepot'
  //     if (hostname.includes('wayfair')) return 'wayfair'
  //     return 'generic'
  //   }

  //   // Extract data from JSON-LD
  //   function extractFromJsonLd($) {
  //     const result = {
  //       title: null,
  //       price: null,
  //       brand: null,
  //       image: null,
  //       description: null,
  //     }

  //     try {
  //       // Find all JSON-LD script tags (some sites have multiple)
  //       const jsonLdScripts = $('script[type="application/ld+json"]')

  //       // Try each JSON-LD block
  //       for (let i = 0; i < jsonLdScripts.length; i++) {
  //         try {
  //           const jsonLdText = $(jsonLdScripts[i]).html()
  //           if (!jsonLdText) continue

  //           // Parse the JSON content
  //           const jsonData = JSON.parse(jsonLdText)

  //           // Handle array of JSON-LD objects
  //           const jsonItems = Array.isArray(jsonData) ? jsonData : [jsonData]

  //           for (const item of jsonItems) {
  //             // Look for Product type or types that might contain product info
  //             const productData = findProductData(item)

  //             if (productData) {
  //               // Extract product information
  //               if (!result.title && productData.name) {
  //                 result.title = productData.name
  //               }

  //               if (!result.brand && productData.brand) {
  //                 result.brand =
  //                   typeof productData.brand === 'string' ? productData.brand : productData.brand?.name || null
  //               }

  //               if (!result.image && productData.image) {
  //                 result.image = Array.isArray(productData.image) ? productData.image[0] : productData.image
  //               }

  //               if (!result.description && productData.description) {
  //                 result.description = productData.description
  //               }

  //               // Extract price - handle different structures
  //               if (!result.price) {
  //                 if (productData.offers) {
  //                   if (Array.isArray(productData.offers)) {
  //                     result.price = productData.offers[0]?.price || productData.offers[0]?.lowPrice || null
  //                   } else {
  //                     result.price = productData.offers.price || productData.offers.lowPrice || null
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         } catch (e) {
  //           console.error('Error parsing JSON-LD block:', e)
  //           // Continue to next JSON-LD block
  //         }
  //       }
  //     } catch (e) {
  //       console.error('Error in JSON-LD extraction:', e)
  //     }

  //     return result
  //   }

  //   // Recursively find product data in JSON-LD
  //   function findProductData(jsonObj) {
  //     if (!jsonObj || typeof jsonObj !== 'object') return null

  //     // Check if this object is a product
  //     if (
  //       jsonObj['@type'] &&
  //       (jsonObj['@type'] === 'Product' || (Array.isArray(jsonObj['@type']) && jsonObj['@type'].includes('Product')))
  //     ) {
  //       return jsonObj
  //     }

  //     // Check for product in hasVariant or itemOffered
  //     if (jsonObj.hasVariant && jsonObj.hasVariant.length > 0) {
  //       return jsonObj.hasVariant[0]
  //     }

  //     if (jsonObj.itemOffered) {
  //       return jsonObj.itemOffered
  //     }

  //     // Check for product in graph array
  //     if (jsonObj['@graph'] && Array.isArray(jsonObj['@graph'])) {
  //       for (const item of jsonObj['@graph']) {
  //         if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
  //           return item
  //         }
  //       }
  //     }

  //     // Check all properties for nested products
  //     for (const key in jsonObj) {
  //       if (typeof jsonObj[key] === 'object' && jsonObj[key] !== null) {
  //         const nestedProduct = findProductData(jsonObj[key])
  //         if (nestedProduct) return nestedProduct
  //       }
  //     }

  //     return null
  //   }

  //   // Extract data using site-specific selectors
  //   function extractSiteSpecific($, siteType) {
  //     const result = {
  //       title: null,
  //       price: null,
  //       brand: null,
  //       image: null,
  //       description: null,
  //     }

  //     switch (siteType) {
  //       case 'amazon':
  //         result.title = $('#productTitle').text().trim() || null
  //         result.price =
  //           $('#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, #price_inside_buybox')
  //             // .first()
  //             .text()
  //             .trim() || null
  //         result.brand =
  //           $('#bylineInfo, .a-row.a-spacing-small .a-size-base:contains("Brand")')
  //             .first()
  //             .text()
  //             .replace('Brand:', '')
  //             .trim() || null
  //         result.image =
  //           $('#landingImage, #imgBlkFront').attr('src') ||
  //           $('#landingImage, #imgBlkFront').attr('data-a-dynamic-image') ||
  //           null
  //         // Handle Amazon's image in data-a-dynamic-image JSON
  //         if (result.image && result.image.startsWith('{')) {
  //           try {
  //             const imageJson = JSON.parse(result.image)
  //             result.image = Object.keys(imageJson)[0] || null
  //           } catch (e) {
  //             console.error('Error parsing Amazon image JSON:', e)
  //           }
  //         }
  //         result.description = $('#productDescription p, #feature-bullets .a-list-item').text().trim() || null
  //         break

  //       case 'flipkart':
  //         result.title = $('.B_NuCI').text().trim() || $('h1 span').text().trim() || null
  //         result.price = $('[class*="_30jeq3"]').first().text().trim() || null
  //         result.brand = $('._2whKao a').first().text().trim() || null
  //         result.image = $('img._396cs4').attr('src') || null
  //         result.description = $('div.yN\\+eNk').text().trim() || null
  //         break

  //       case 'chewy':
  //         result.title = $('h1.pdp-e-i-head, h1[data-testid="product-title"]').text().trim() || null
  //         result.price = $('span.payBlkBig, .price-container .ga-eec__price').text().trim() || null
  //         result.brand = $('span.bcrumb-last, .ga-eec__brand').text().trim() || null
  //         result.image = $('img.cloudzoom, .product-image-container img').attr('src') || null
  //         result.description = $('#specifications .detailssubbox, .descriptions-content').text().trim() || null
  //         break

  //       case 'walmart':
  //         result.title = $('h1.prod-ProductTitle').text().trim() || null
  //         result.price = $('span.price-characteristic').text().trim() || null
  //         result.brand = $('a.prod-brandName').text().trim() || null
  //         result.image = $('img.prod-hero-image').attr('src') || null
  //         result.description = $('.prod-ProductDescription').text().trim() || null
  //         break

  //       case 'bestbuy':
  //         result.title = $('.sku-title h1').text().trim() || null
  //         result.price = $('.priceView-customer-price span').first().text().trim() || null
  //         result.brand = $('.brand-name').text().trim() || null
  //         result.image = $('.primary-image').attr('src') || null
  //         result.description = $('.product-description').text().trim() || null
  //         break

  //       case 'target':
  //         result.title = $('h1[data-test="product-title"]').text().trim() || null
  //         result.price = $('[data-test="product-price"]').text().trim() || null
  //         result.brand = $('.styles__BrandLink-sc-1ljcxl3-0').text().trim() || null
  //         result.image = $('img[data-test="product-image"]').attr('src') || null
  //         result.description = $('[data-test="product-description"]').text().trim() || null
  //         break

  //       case 'ebay':
  //         result.title = $('#itemTitle').text().replace('Details about', '').trim() || null
  //         result.price = $('#prcIsum').text().trim() || null
  //         result.brand = $('.ux-textspans--BOLD:contains("Brand:")').next().text().trim() || null
  //         result.image = $('#icImg').attr('src') || null
  //         result.description = $('#desc_ifr').contents().find('#ds_div').text().trim() || null
  //         break

  //       case 'etsy':
  //         result.title = $('.wt-text-body-01').first().text().trim() || null
  //         result.price = $('.wt-text-title-03').text().trim() || null
  //         result.brand = $('.wt-text-body-01 a[href*="/shop/"]').text().trim() || null
  //         result.image = $('.wt-max-width-full').attr('src') || null
  //         result.description = $('.wt-content-toggle__body').text().trim() || null
  //         break

  //       case 'newegg':
  //         result.title = $('.product-title').text().trim() || null
  //         result.price = $('.price-current').text().trim() || null
  //         result.brand = $('.product-brand img').attr('alt') || null
  //         result.image = $('.product-view-img-original').attr('src') || null
  //         result.description = $('.product-bullets li').text().trim() || null
  //         break

  //       case 'homedepot':
  //         result.title = $('h1.product-title__title').text().trim() || null
  //         result.price = $('.price__dollars').text().trim() || null
  //         result.brand = $('.product-details__brand-link').text().trim() || null
  //         result.image = $('.mediagallery__mainimage').attr('src') || null
  //         result.description = $('.product-details__description').text().trim() || null
  //         break

  //       case 'wayfair':
  //         result.title = $('h1.ProductDetailInfoBlock-header').text().trim() || null
  //         result.price = $('.SFPrice').text().trim() || null
  //         result.brand = $('.BrandInfoBlock-brandLink').text().trim() || null
  //         result.image = $('.ImageGallery-image').attr('src') || null
  //         result.description = $('.ProductOverviewInformation-content').text().trim() || null
  //         break
  //     }

  //     return result
  //   }

  //   // Extract data using generic selectors as a fallback
  //   function extractGeneric($) {
  //     return {
  //       title: $('h1, .product-title, .title, [itemprop="name"]').first().text().trim() || null,
  //       price:
  //         $('.price, .product-price, [itemprop="price"], .price-current, .current-price').first().text().trim() || null,
  //       brand: $('.brand, [itemprop="brand"], .manufacturer, .vendor').first().text().trim() || null,
  //       image:
  //         $('img.product-image, [itemprop="image"], .main-image, .primary-image').first().attr('src') ||
  //         $('meta[property="og:image"]').attr('content') ||
  //         null,
  //       description:
  //         $('.description, [itemprop="description"], .product-description, .details, .overview')
  //           .first()
  //           .text()
  //           .trim() || null,
  //     }
  //   }

  //   // Clean up price string to extract numeric value
  //   function cleanPrice(priceStr) {
  //     console.log('Raw price:', priceStr, 'Type:', typeof priceStr)
  //     if (!priceStr) return null

  //     // Remove currency symbols and non-numeric characters except decimal point
  //     let cleanedPrice = priceStr.toString().replace(/[^\d.,]/g, '')

  //     // Handle different decimal/thousand separators
  //     if (cleanedPrice.includes(',') && cleanedPrice.includes('.')) {
  //       // If both comma and period exist, determine which is the decimal separator
  //       const lastCommaIndex = cleanedPrice.lastIndexOf(',')
  //       const lastDotIndex = cleanedPrice.lastIndexOf('.')

  //       if (lastCommaIndex > lastDotIndex) {
  //         // Comma is likely the decimal separator (European format)
  //         cleanedPrice = cleanedPrice.replace(/\./g, '').replace(',', '.')
  //       } else {
  //         // Period is likely the decimal separator (US format)
  //         cleanedPrice = cleanedPrice.replace(/,/g, '')
  //       }
  //     } else if (cleanedPrice.includes(',')) {
  //       // Only commas exist - check if it's a decimal separator or thousand separator
  //       if (cleanedPrice.split(',')[1]?.length === 2) {
  //         // Likely a decimal separator
  //         cleanedPrice = cleanedPrice.replace(',', '.')
  //       } else {
  //         // Likely a thousand separator
  //         cleanedPrice = cleanedPrice.replace(/,/g, '')
  //       }
  //     }

  //     // Convert to number and format with 2 decimal places
  //     const numPrice = parseFloat(cleanedPrice)
  //     return isNaN(numPrice) ? null : numPrice
  //   }
  //   function cleanDescription(description) {
  //     return description
  //       .replace(/\n+/g, ' ') // Replace all newlines with space
  //       .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
  //       .trim() // Trim leading/trailing spaces
  //   }
  //   const { url } = req.body
  //   try {
  //     const client = new ZenRows('6d0a24a6d0b994b6899bf797b7f50d49494d332b')

  //     const request = await client.get(url, {
  //       js_render: 'true',
  //       premium_proxy: 'true',
  //       // Remove json_response to get the raw HTML
  //       // json_response: 'true',
  //     })

  //     const data = await request.text() // Get the raw HTML response
  //     console.log('Raw HTML received')
  //     console.log('parsed data', data)
  //     // Parse the HTML with cheerio
  //     const cheerio = require('cheerio')
  //     const $ = cheerio.load(data)

  //     // Detect which e-commerce site we're dealing with
  //     const hostname = new URL(url).hostname
  //     console.log('Hostname:', hostname)
  //     const siteType = detectSiteType(hostname)
  //     console.log('Detected site type:', siteType)

  //     // Initialize extracted data object
  //     let extractedData = {
  //       title: null,
  //       price: null,
  //       brand: null,
  //       image: null,
  //       description: null,
  //     }

  //     // Try to extract data from JSON-LD first (most reliable for many sites)
  //     try {
  //       const jsonLdData = extractFromJsonLd($)
  //       if (jsonLdData && Object.values(jsonLdData).some((val) => val !== null)) {
  //         extractedData = { ...extractedData, ...jsonLdData }
  //         console.log('Data extracted from JSON-LD')
  //       }
  //     } catch (jsonError) {
  //       console.error('Error extracting from JSON-LD:', jsonError)
  //     }

  //     // Apply site-specific extraction if needed
  //     if (Object.values(extractedData).some((val) => val === null)) {
  //       const siteSpecificData = extractSiteSpecific($, siteType)
  //       // Merge data, keeping existing non-null values
  //       Object.keys(siteSpecificData).forEach((key) => {
  //         if (extractedData[key] === null && siteSpecificData[key] !== null) {
  //           extractedData[key] = siteSpecificData[key]
  //         }
  //       })
  //       console.log('Applied site-specific extraction')
  //     }

  //     // Apply generic extraction as final fallback
  //     if (Object.values(extractedData).some((val) => val === null)) {
  //       const genericData = extractGeneric($)
  //       // Merge data, keeping existing non-null values
  //       Object.keys(genericData).forEach((key) => {
  //         if (extractedData[key] === null && genericData[key] !== null) {
  //           extractedData[key] = genericData[key]
  //         }
  //       })
  //       console.log('Applied generic extraction')
  //     }

  //     // Clean up price if found
  //     if (extractedData.price) {
  //       extractedData.price = cleanPrice(extractedData.price)
  //     }
  //     if (extractedData.description) {
  //       extractedData.description = cleanDescription(extractedData.description)
  //     }
  //     // Log the extracted data for debugging
  //     console.log('Final extracted data:', extractedData)

  //     res.status(StatusCodes.OK).json({
  //       data: extractedData,
  //       message: 'Product data fetched successfully.',
  //     })
  //   } catch (error) {
  //     console.error('Error scraping:', error)
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'Error scraping: ' + error.message,
  //     })
  //   }
  // }),
  webCrawlerApify: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    try {
      // Run an Apify Actor (e.g., "web-scraper")
      const runResponse = await axios.post(
        'https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items',
        {
          startUrls: [{ url }],
          extract: {
            title: 'h1',
            price: '.price, [itemprop="price"]',
            description: '.description',
            brand: '.brand',
          },
        },
        {
          params: {
            token: 'apify_api_cPUodr2fbTEZAxo3fEkcYxFbogOlVc0xPjDb', // Replace with your token
          },
        }
      )

      // Apify returns data in `runResponse.data`
      const productData = runResponse.data[0] || {}
      const extractedData = {
        title: productData.title || null,
        price: productData.price || null,
        brand: productData.brand || null,
        image: productData.image || null, // Add CSS selector logic if needed
        description: productData.description || null,
      }

      res.status(StatusCodes.OK).json({
        data: extractedData,
        message: 'Product data fetched via Apify.',
      })
    } catch (error) {
      console.error('Apify Error:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Apify Error: ' + error.message,
      })
    }
  }),
  webCrawlerScrapingBee: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    try {
      const response = await axios.get('https://app.scrapingbee.com/api/v1', {
        params: {
          api_key: 'MTBXWDECZTSZDXNFUTR8ILAOFU5TNL3VOZNHCV06XOP310QP5UYY8E5ARAENKYOI405PRJMUM9WVKNHK', // Replace with your key
          url,
          extract_rules: JSON.stringify({
            title: 'h1',
            price: '.price, .product-price, [itemprop="price"]',
            description: '.description, [itemprop="description"]',
            brand: '.brand, [itemprop="brand"]',
            image: 'img.product-image | src',
          }),
        },
      })

      const extractedData = {
        title: response.data.title || null,
        price: response.data.price || null,
        brand: response.data.brand || null,
        image: response.data.image || null,
        description: response.data.description || null,
      }

      res.status(StatusCodes.OK).json({
        data: extractedData,
        message: 'Product data fetched via ScrapingBee.',
      })
    } catch (error) {
      console.error('ScrapingBee Error:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'ScrapingBee Error: ' + error.message,
      })
    }
  }),
  webCrawlerScrapingBot: asyncMiddleware(async (req, res) => {
    const { url } = req.body
    try {
      const response = await axios.get('https://api.scrapingbot.io/scrape', {
        params: {
          api_key: 'YOUR_SCRAPINGBOT_KEY',
          url,
          renderJs: 'true', // Render JavaScript
          extractRules: JSON.stringify({
            title: 'h1',
            price: '.price',
            brand: '.brand',
            description: '.description',
            image: 'img.product-image | src',
          }),
        },
      })

      const extractedData = {
        title: response.data.title || null,
        price: response.data.price || null,
        brand: response.data.brand || null,
        image: response.data.image || null,
        description: response.data.description || null,
      }

      res.status(StatusCodes.OK).json({
        data: extractedData,
        message: 'Product data fetched via ScrapingBot.',
      })
    } catch (error) {
      console.error('ScrapingBot Error:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'ScrapingBot Error: ' + error.message,
      })
    }
  }),
}

// Helper Function to scrape product data from walmart website.
const scrapeWalmartData = async (url) => {
  const browser = await createBrowser()
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })

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
      document.querySelector('[itemprop="name"]')?.innerText?.trim() || document.querySelector('h1')?.innerText?.trim()

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
  return productData
}
