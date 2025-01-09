const { Parser } = require('htmlparser2')

class Walmart {
  detect(url, html) {
    return url.includes('walmart.com')
  }

  parse(html, url) {
    const product = {
      platform: 'Walmart',
      siteName: 'Walmart',
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
    let isPriceDiv = false

    const parser = new Parser(
      {
        onopentag(name, attributes) {
          if (name === 'span' && attributes.class && attributes.class.includes('prod-ProductTitle')) {
            isProductTitle = true
          } else if (name === 'div' && attributes.class && attributes.class.includes('price')) {
            isPriceDiv = true
          } else if (name === 'img' && attributes.src) {
            product.image = attributes.src
          }
        },
        ontext(text) {
          if (isProductTitle) {
            product.title += text.trim()
          } else if (isPriceDiv && !product.price) {
            const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/)
            if (priceMatch) {
              product.price = priceMatch[1]
            }
          }
        },
        onclosetag(name) {
          if (name === 'span' && isProductTitle) {
            isProductTitle = false
          } else if (name === 'div' && isPriceDiv) {
            isPriceDiv = false
          }
        },
      },
      { decodeEntities: false }
    )

    parser.write(html)
    parser.end()

    return product
  }
}

module.exports = Walmart
