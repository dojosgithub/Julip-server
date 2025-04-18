// Helper function to detect site type
function detectSiteType(hostname) {
  if (hostname.includes('amazon')) return 'amazon'
  if (hostname.includes('flipkart')) return 'flipkart'
  if (hostname.includes('chewy')) return 'chewy'
  if (hostname.includes('walmart')) return 'walmart'
  if (hostname.includes('bestbuy')) return 'bestbuy'
  if (hostname.includes('target')) return 'target'
  if (hostname.includes('ebay')) return 'ebay'
  if (hostname.includes('etsy')) return 'etsy'
  if (hostname.includes('newegg')) return 'newegg'
  if (hostname.includes('homedepot')) return 'homedepot'
  if (hostname.includes('wayfair')) return 'wayfair'
  return 'generic'
}

// Extract data from JSON-LD
function extractFromJsonLd($) {
  const result = {
    title: null,
    price: null,
    brand: null,
    image: null,
    description: null,
  }

  try {
    // Find all JSON-LD script tags (some sites have multiple)
    const jsonLdScripts = $('script[type="application/ld+json"]')

    // Try each JSON-LD block
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonLdText = $(jsonLdScripts[i]).html()
        if (!jsonLdText) continue

        // Parse the JSON content
        const jsonData = JSON.parse(jsonLdText)

        // Handle array of JSON-LD objects
        const jsonItems = Array.isArray(jsonData) ? jsonData : [jsonData]

        for (const item of jsonItems) {
          // Look for Product type or types that might contain product info
          const productData = findProductData(item)

          if (productData) {
            // Extract product information
            if (!result.title && productData.name) {
              result.title = productData.name
            }

            if (!result.brand && productData.brand) {
              result.brand = typeof productData.brand === 'string' ? productData.brand : productData.brand?.name || null
            }

            if (!result.image && productData.image) {
              result.image = Array.isArray(productData.image) ? productData.image[0] : productData.image
            }

            if (!result.description && productData.description) {
              result.description = productData.description
            }

            // Extract price - handle different structures
            if (!result.price) {
              if (productData.offers) {
                if (Array.isArray(productData.offers)) {
                  result.price = productData.offers[0]?.price || productData.offers[0]?.lowPrice || null
                } else {
                  result.price = productData.offers.price || productData.offers.lowPrice || null
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing JSON-LD block:', e)
        // Continue to next JSON-LD block
      }
    }
  } catch (e) {
    console.error('Error in JSON-LD extraction:', e)
  }

  return result
}

// Recursively find product data in JSON-LD
function findProductData(jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') return null

  // Check if this object is a product
  if (
    jsonObj['@type'] &&
    (jsonObj['@type'] === 'Product' || (Array.isArray(jsonObj['@type']) && jsonObj['@type'].includes('Product')))
  ) {
    return jsonObj
  }

  // Check for product in hasVariant or itemOffered
  if (jsonObj.hasVariant && jsonObj.hasVariant.length > 0) {
    return jsonObj.hasVariant[0]
  }

  if (jsonObj.itemOffered) {
    return jsonObj.itemOffered
  }

  // Check for product in graph array
  if (jsonObj['@graph'] && Array.isArray(jsonObj['@graph'])) {
    for (const item of jsonObj['@graph']) {
      if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
        return item
      }
    }
  }

  // Check all properties for nested products
  for (const key in jsonObj) {
    if (typeof jsonObj[key] === 'object' && jsonObj[key] !== null) {
      const nestedProduct = findProductData(jsonObj[key])
      if (nestedProduct) return nestedProduct
    }
  }

  return null
}

// Extract data using site-specific selectors
function extractSiteSpecific($, siteType) {
  const result = {
    title: null,
    price: null,
    brand: null,
    image: null,
    description: null,
  }

  switch (siteType) {
    case 'amazon':
      result.title = $('#productTitle').text().trim() || null
      result.price =
        $('#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, #price_inside_buybox')
          .first()
          .text()
          .trim() || null
      result.brand =
        $('#bylineInfo, .a-row.a-spacing-small .a-size-base:contains("Brand")')
          .first()
          .text()
          .replace('Brand:', '')
          .trim() || null
      result.image =
        $('#landingImage, #imgBlkFront').attr('src') ||
        $('#landingImage, #imgBlkFront').attr('data-a-dynamic-image') ||
        null
      // Handle Amazon's image in data-a-dynamic-image JSON
      if (result.image && result.image.startsWith('{')) {
        try {
          const imageJson = JSON.parse(result.image)
          result.image = Object.keys(imageJson)[0] || null
        } catch (e) {
          console.error('Error parsing Amazon image JSON:', e)
        }
      }
      result.description = $('#productDescription p, #feature-bullets .a-list-item').text().trim() || null
      break

    case 'flipkart':
      result.title = $('.B_NuCI').text().trim() || $('h1 span').text().trim() || null
      result.price = $('._30jeq3._16Jk6d').text().trim() || null
      result.brand = $('._2whKao').text().trim() || null
      result.image = $('img._396cs4').attr('src') || null
      result.description = $('._1mXcCf.RmoJUa, ._1AN87F').text().trim() || null
      break

    case 'chewy':
      result.title = $('h1.pdp-e-i-head, h1[data-testid="product-title"]').text().trim() || null
      result.price = $('span.payBlkBig, .price-container .ga-eec__price').text().trim() || null
      result.brand = $('span.bcrumb-last, .ga-eec__brand').text().trim() || null
      result.image = $('img.cloudzoom, .product-image-container img').attr('src') || null
      result.description = $('#specifications .detailssubbox, .descriptions-content').text().trim() || null
      break

    case 'walmart':
      result.title = $('h1.prod-ProductTitle').text().trim() || null
      result.price = $('span.price-characteristic').text().trim() || null
      result.brand = $('a.prod-brandName').text().trim() || null
      result.image = $('img.prod-hero-image').attr('src') || null
      result.description = $('.prod-ProductDescription').text().trim() || null
      break

    case 'bestbuy':
      result.title = $('.sku-title h1').text().trim() || null
      result.price = $('.priceView-customer-price span').first().text().trim() || null
      result.brand = $('.brand-name').text().trim() || null
      result.image = $('.primary-image').attr('src') || null
      result.description = $('.product-description').text().trim() || null
      break

    case 'target':
      result.title = $('h1[data-test="product-title"]').text().trim() || null
      result.price = $('[data-test="product-price"]').text().trim() || null
      result.brand = $('.styles__BrandLink-sc-1ljcxl3-0').text().trim() || null
      result.image = $('img[data-test="product-image"]').attr('src') || null
      result.description = $('[data-test="product-description"]').text().trim() || null
      break

    case 'ebay':
      result.title = $('#itemTitle').text().replace('Details about', '').trim() || null
      result.price = $('#prcIsum').text().trim() || null
      result.brand = $('.ux-textspans--BOLD:contains("Brand:")').next().text().trim() || null
      result.image = $('#icImg').attr('src') || null
      result.description = $('#desc_ifr').contents().find('#ds_div').text().trim() || null
      break

    case 'etsy':
      result.title = $('.wt-text-body-01').first().text().trim() || null
      result.price = $('.wt-text-title-03').text().trim() || null
      result.brand = $('.wt-text-body-01 a[href*="/shop/"]').text().trim() || null
      result.image = $('.wt-max-width-full').attr('src') || null
      result.description = $('.wt-content-toggle__body').text().trim() || null
      break

    case 'newegg':
      result.title = $('.product-title').text().trim() || null
      result.price = $('.price-current').text().trim() || null
      result.brand = $('.product-brand img').attr('alt') || null
      result.image = $('.product-view-img-original').attr('src') || null
      result.description = $('.product-bullets li').text().trim() || null
      break

    case 'homedepot':
      result.title = $('h1.product-title__title').text().trim() || null
      result.price = $('.price__dollars').text().trim() || null
      result.brand = $('.product-details__brand-link').text().trim() || null
      result.image = $('.mediagallery__mainimage').attr('src') || null
      result.description = $('.product-details__description').text().trim() || null
      break

    case 'wayfair':
      result.title = $('h1.ProductDetailInfoBlock-header').text().trim() || null
      result.price = $('.SFPrice').text().trim() || null
      result.brand = $('.BrandInfoBlock-brandLink').text().trim() || null
      result.image = $('.ImageGallery-image').attr('src') || null
      result.description = $('.ProductOverviewInformation-content').text().trim() || null
      break
  }

  return result
}

// Extract data using generic selectors as a fallback
function extractGeneric($) {
  return {
    title: $('h1, .product-title, .title, [itemprop="name"]').first().text().trim() || null,
    price:
      $('.price, .product-price, [itemprop="price"], .price-current, .current-price').first().text().trim() || null,
    brand: $('.brand, [itemprop="brand"], .manufacturer, .vendor').first().text().trim() || null,
    image:
      $('img.product-image, [itemprop="image"], .main-image, .primary-image').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null,
    description:
      $('.description, [itemprop="description"], .product-description, .details, .overview').first().text().trim() ||
      null,
  }
}

// Clean up price string to extract numeric value
function cleanPrice(priceStr) {
  if (!priceStr) return null

  // Remove currency symbols and non-numeric characters except decimal point
  let cleanedPrice = priceStr.replace(/[^\d.,]/g, '')

  // Handle different decimal/thousand separators
  if (cleanedPrice.includes(',') && cleanedPrice.includes('.')) {
    // If both comma and period exist, determine which is the decimal separator
    const lastCommaIndex = cleanedPrice.lastIndexOf(',')
    const lastDotIndex = cleanedPrice.lastIndexOf('.')

    if (lastCommaIndex > lastDotIndex) {
      // Comma is likely the decimal separator (European format)
      cleanedPrice = cleanedPrice.replace(/\./g, '').replace(',', '.')
    } else {
      // Period is likely the decimal separator (US format)
      cleanedPrice = cleanedPrice.replace(/,/g, '')
    }
  } else if (cleanedPrice.includes(',')) {
    // Only commas exist - check if it's a decimal separator or thousand separator
    if (cleanedPrice.split(',')[1]?.length === 2) {
      // Likely a decimal separator
      cleanedPrice = cleanedPrice.replace(',', '.')
    } else {
      // Likely a thousand separator
      cleanedPrice = cleanedPrice.replace(/,/g, '')
    }
  }

  // Convert to number and format with 2 decimal places
  const numPrice = parseFloat(cleanedPrice)
  return isNaN(numPrice) ? null : numPrice
}
