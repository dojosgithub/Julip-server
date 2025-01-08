import { fetchAndParseURL } from '../utils/product_scraping/parser'

// Controller to handle product scraping
export async function scrapeProduct(request) {
  try {
    const body = await request.json()

    // Fetch and parse the URL
    const result = await fetchAndParseURL(body.url)

    // Handle errors or return data
    if ('error' in result) {
      return { status: 400, body: { error: result.error } }
    }

    return { status: 200, body: { data: result } }
  } catch (error) {
    console.error('Error in scrapeProduct:', error)
    return { status: 500, body: { error: 'Internal server error' } }
  }
}
