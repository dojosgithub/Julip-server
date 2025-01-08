import { Parser } from "htmlparser2";
import { PlatformParser, ParsedProduct } from "./typeParser";

export class Walmart implements PlatformParser {
  detect(url, html) {
    return url.includes("walmart.com");
  }

  parse(html, url) {
    const product = {
      platform: "Walmart",
      siteName: "Walmart",
      productUrl: url,
      title: "",
      description: "",
      price: "",
      currency: "$",
      image: "",
      productType: "",
      brand: "",
    };

    let isProductTitle = false;
    let isPriceDiv = false;

    const parser = new Parser(
      {
        onopentag(name, attributes) {
          if (name === "h1" && attributes.class?.includes("prod-ProductTitle")) {
            isProductTitle = true;
          } else if (name === "span" && attributes.class?.includes("price-characteristic")) {
            isPriceDiv = true;
          }
        },
        ontext(text) {
          if (isProductTitle) {
            product.title += text.trim();
          } else if (isPriceDiv) {
            product.price += text.trim();
          }
        },
        onclosetag(name) {
          if (name === "h1" && isProductTitle) {
            isProductTitle = false;
          } else if (name === "span" && isPriceDiv) {
            isPriceDiv = false;
          }
        },
      },
      { decodeEntities: true }
    );

    parser.write(html);
    parser.end();

    return product;
  }
}
