export interface ParsedProduct {
    platform: string;
    siteName?: string;
    productUrl?: string;
    title: string;
    productType?: string;
    description: string;
    price?: string;
    currency?: string;
    image?: string;
    brand?: string;
}

export interface PlatformParser {
    detect: (url: string, html: string) => boolean;
    parse: (html: string, url: string) => ParsedProduct;
}