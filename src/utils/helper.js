export const extractWithFallbacks = ($, extractedData) => {
  if (!extractedData.title) {
    extractedData.title = $('h1.pdp-e-i-head, h1.product-title, h1[itemprop="name"], h1').first().text().trim() || null
  }

  if (!extractedData.price) {
    extractedData.price = $('span.payBlkBig, .product-price, span[itemprop="price"], .price').first().text().trim()
  }

  if (!extractedData.brand) {
    extractedData.brand = $('span.bcrumb-last, .brand, [itemprop="brand"]').first().text().trim() || null
  }

  if (!extractedData.image) {
    extractedData.image = $('img.cloudzoom, img.product-image, [itemprop="image"]').first().attr('src') || null
  }

  if (!extractedData.description) {
    extractedData.description =
      $('#specifications .detailssubbox, .product-description, [itemprop="description"]').first().text().trim() || null
  }

  return extractedData
}

export const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  // Add more if needed
}
