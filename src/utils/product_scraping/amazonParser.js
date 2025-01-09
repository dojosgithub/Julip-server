const { Parser } = require('htmlparser2')
const { decode } = require('html-entities')

class Amazon {
  detect(url, html) {
    return url.includes('amazon.com')
  }

  parse(html, url) {
    const product = {
      platform: 'Amazon',
      siteName: 'Amazon',
      productUrl: url,
      title: '',
      description: '',
      price: '',
      currency: '$',
      image: '',
      productType: '',
      brand: '',
    }

    let isProductTitle = false
    let isProductDescription = false
    let isCorePriceDiv = false
    let isBrandRow = false
    let priceFound = false
    let brandFound = false
    let currentBrandText = ''

    const parser = new Parser(
      {
        onopentag(name, attributes) {
          if (name === 'span' && attributes.id === 'productTitle') {
            isProductTitle = true
          } else if (name === 'div' && attributes.id === 'productDescription') {
            isProductDescription = true
          } else if (name === 'div' && attributes.id === 'corePrice_feature_div') {
            isCorePriceDiv = true
          } else if (name === 'img' && attributes.id === 'landingImage') {
            product.image = decode(attributes['data-old-hires'] || attributes.src || '')
          } else if (name === 'tr' && attributes.class && attributes.class.includes('po-brand')) {
            isBrandRow = true
            currentBrandText = ''
          }
        },
        ontext(text) {
          if (isProductTitle) {
            product.title += text
          } else if (isProductDescription) {
            product.description += text + ' '
          } else if (isCorePriceDiv && !priceFound) {
            const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/)
            if (priceMatch) {
              product.price = priceMatch[1]
              priceFound = true
            }
          } else if (isBrandRow && !brandFound) {
            currentBrandText += text
          }
        },
        onclosetag(name) {
          if (name === 'span' && isProductTitle) {
            isProductTitle = false
            product.title = decode(product.title.trim())
          } else if (name === 'div') {
            if (isProductDescription) {
              isProductDescription = false
              product.description = decode(product.description.trim())
            }
            if (isCorePriceDiv) {
              isCorePriceDiv = false
            }
          } else if (name === 'tr' && isBrandRow) {
            isBrandRow = false
            if (!brandFound) {
              const cleanedBrandText = currentBrandText.replace('Brand', '').trim()
              if (cleanedBrandText) {
                product.brand = decode(cleanedBrandText)
                brandFound = true
              }
            }
          }
        },
      },
      { decodeEntities: false }
    )

    parser.write(html)
    parser.end()

    // Set product type based on decoded title and description
    if (product.title.toLowerCase().includes('dog') || product.description.toLowerCase().includes('dog')) {
      if (product.title.toLowerCase().includes('paw balm') || product.description.toLowerCase().includes('paw balm')) {
        product.productType = 'Dog Paw Care'
      } else {
        product.productType = 'Dog Product'
      }
    }

    return product
  }
}

module.exports = Amazon
