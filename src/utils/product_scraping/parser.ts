import fetch from "node-fetch";
import { Readable } from "stream";
import { ParsedProduct, PlatformParser } from "./typeParser";
import { Amazon } from "./amazonParser";
import { Shopify } from "./shopifyParser";
import { Walmart } from "./wallmartParser";

const parsers: PlatformParser[] = [
  new Amazon(),
  new Shopify(),
  new Walmart(),
  // Add more parsers here
];

export async function fetchAndParseURL(url: string): Promise<ParsedProduct | { error: string }> {
  console.log(`Starting to fetch and parse URL: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error("No response body");
    }

    const readable = Readable.from(body);
    let html = "";

    for await (const chunk of readable) {
      html += chunk.toString();
    }

    for (const platformParser of parsers) {
      console.log(`Trying parser: ${platformParser.constructor.name}`);
      try {
        if (platformParser.detect(url, html)) {
          console.log(`Detected platform: ${platformParser.constructor.name}`);
          const parsedProduct = platformParser.parse(html, url);
          console.log("Parsed product:", JSON.stringify(parsedProduct, null, 2));
          if (isValidProduct(parsedProduct)) {
            console.log("Valid product found");
            return parsedProduct;
          } else {
            console.log("Invalid product, continuing to next parser");
          }
        } else {
          console.log(`${platformParser.constructor.name} did not detect a match`);
        }
      } catch (parserError) {
        console.error(`Error in ${platformParser.constructor.name}:`, parserError);
      }
    }

    console.log("Could not detect platform or parse product data");
    return { error: "Could not detect platform or parse product data" };
  } catch (error) {
    console.error("Failed to fetch or parse URL:", error);
    return { error: "Could not fetch or parse URL" };
  }
}

function isValidProduct(product: ParsedProduct): boolean {
  const isValid = product &&
    Object.keys(product).length > 0 &&
    (!!product.title || !!product.description || !!product.image);
  console.log(`Product validity check: ${isValid}`, product);
  return isValid;
}

export { PlatformParser, ParsedProduct };