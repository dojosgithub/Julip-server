import { Parser } from "htmlparser2";
import { PlatformParser, ParsedProduct } from "./typeParser";
import { decode } from "html-entities";

export class Shopify implements PlatformParser {
  detect(url: string, html: string): boolean {
    return html.includes("Shopify") || url.includes("myshopify.com");
  }

  parse(html: string, url: string): ParsedProduct {
    const product: ParsedProduct = {
      platform: "Shopify",
      siteName: "",
      productUrl: url,
      title: "",
      description: "",
      price: "",
      currency: "USD",
      image: "",
      productType: "",
      brand: "",
    };

    let currentScriptContent = "";
    let isJsonScript = false;
    let isPriceSpan = false;

    const parser = new Parser({
      onopentag: (name, attributes) => {
        if (name === "meta" && attributes.content) {
          const property = attributes.property || attributes.name || "";
          const content = decode(attributes.content);

          switch (property) {
            case "og:title":
              if (!product.title) {
                product.title = content;
              }
              break;
            case "og:description":
              if (!product.description) {
                product.description = content;
              }
              break;
            case "og:image":
            case "og:image:secure_url":
              if (!product.image) {
                product.image = content;
              }
              break;
            case "og:site_name":
              if (!product.siteName) {
                product.siteName = content;
              }
              break;
            case "og:price:amount":
              if (!product.price) {
                product.price = content;
              }
              break;
            case "og:price:currency":
              product.currency = content;
              break;
          }
        } else if (name === "script" && attributes.type === "application/ld+json") {
          isJsonScript = true;
          currentScriptContent = ""; // Reset content for new script tag
        } else if (name === "span" && attributes.class &&
          (attributes.class.includes("price-item--regular") ||
            attributes.class.includes("product__price"))) {
          isPriceSpan = true;
        }
      },
      ontext: (text) => {
        if (isJsonScript) {
          currentScriptContent += text;
        } else if (isPriceSpan && !product.price) {
          const priceMatch = text.match(/[\d,.]+/);
          if (priceMatch) {
            product.price = priceMatch[0].trim();
          }
        }
      },
      onclosetag: (name) => {
        if (name === "script" && isJsonScript) {
          try {
            this.parseJsonLd(currentScriptContent, product);
          } catch (e) {
            console.log("Error parsing JSON-LD script (non-fatal):", e);
          }
          isJsonScript = false;
          currentScriptContent = "";
        } else if (name === "span") {
          isPriceSpan = false;
        }
      },
    }, { decodeEntities: false });

    parser.write(html);
    parser.end();

    // Additional URL parsing for product type if not set
    if (!product.productType) {
      const urlMatch = url.match(/\/products\/([^/?]+)/);
      if (urlMatch) {
        product.productType = urlMatch[1].split("-").map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ");
      }
    }

    // Log the final product for debugging
    console.log("Final product after parsing:", product);

    return product;
  }

  private parseJsonLd(content: string, product: ParsedProduct): void {
    try {
      // Clean the content before parsing
      // eslint-disable-next-line no-control-regex
      const cleanContent = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();

      let jsonData;
      try {
        jsonData = JSON.parse(cleanContent);
      } catch (e) {
        // Try parsing as array or fix common JSON issues
        if (cleanContent.startsWith("[") && cleanContent.endsWith("]")) {
          jsonData = JSON.parse(cleanContent);
        } else {
          const fixedContent = cleanContent
            .replace(/,\s*}/g, "}")  // Remove trailing commas
            .replace(/,\s*\]/g, "]")
            .replace(/\\/g, "\\\\")  // Escape backslashes
            .replace(/"\s+"/g, "\" \"");  // Fix spaces between quotes
          jsonData = JSON.parse(`[${fixedContent}]`);
        }
      }

      const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

      for (const data of dataArray) {
        if (data["@type"] === "Product") {
          // Only update fields that haven't been set by meta tags
          if (!product.title && data.name) {
            product.title = decode(data.name);
          }
          if (!product.description && data.description) {
            product.description = decode(data.description);
          }
          if (data.offers) {
            const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
            if (offers.price && !product.price) {
              product.price = String(offers.price);
              if (offers.priceCurrency) {
                product.currency = offers.priceCurrency;
              }
            }
          }
          if (!product.image && data.image) {
            product.image = decode(Array.isArray(data.image) ? data.image[0] : data.image);
          }
          if (!product.brand && data.brand) {
            product.brand = decode(typeof data.brand === "string" ? data.brand : data.brand.name || "");
          }
          if (!product.productType && data.category) {
            product.productType = decode(data.category);
          }
        }
      }
    } catch (e) {
      console.error("Error parsing JSON-LD content:", e);
    }
  }
}