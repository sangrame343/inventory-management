import { NextResponse } from "next/server";

function decodeEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Use full browser headers to avoid Amazon/e-commerce bot checks
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0"
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch webpage" }, { status: 500 });
    }

    const html = await response.text();

    let imageUrl = "";
    let title = "";
    let brand = "";
    let price = "";
    let description = "";

    // 1. Extract og:image, twitter:image
    const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
    const ogImageRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;
    const twitterImageRegex = /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i;
    const twitterImageRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i;

    let imgMatch = html.match(ogImageRegex) || html.match(ogImageRegexAlt) || html.match(twitterImageRegex) || html.match(twitterImageRegexAlt);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }

    // 2. Extract og:title, title
    const ogTitleRegex = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i;
    const ogTitleRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i;
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;

    let titleMatch = html.match(ogTitleRegex) || html.match(ogTitleRegexAlt) || html.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }

    // 3. Extract og:description, description
    const ogDescRegex = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i;
    const ogDescRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i;
    const descRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i;

    let descMatch = html.match(ogDescRegex) || html.match(ogDescRegexAlt) || html.match(descRegex);
    if (descMatch && descMatch[1]) {
      description = descMatch[1];
    }

    // 4. Extract og:price:amount
    const ogPriceRegex = /<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i;
    const priceMatch = html.match(ogPriceRegex);
    if (priceMatch && priceMatch[1]) {
      price = priceMatch[1];
    }

    // 5. Parse JSON-LD
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch;
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        if (data) {
          const items = Array.isArray(data) ? data : (data["@graph"] && Array.isArray(data["@graph"]) ? data["@graph"] : [data]);
          for (const item of items) {
            if (item["@type"] === "Product" || item.name || item.brand || item.offers) {
              if (item.name && !title) title = item.name;
              
              if (item.brand) {
                if (typeof item.brand === "string") {
                  brand = item.brand;
                } else if (typeof item.brand === "object" && item.brand.name) {
                  brand = item.brand.name;
                }
              }

              if (item.offers) {
                const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const offer of offers) {
                  if (offer.price) {
                    price = String(offer.price);
                    break;
                  }
                }
              }

              if (item.description && !description) description = item.description;

              const checkImage = (obj: any): string | null => {
                if (!obj) return null;
                if (typeof obj === "string") return obj;
                if (Array.isArray(obj) && obj.length > 0) return checkImage(obj[0]);
                if (typeof obj === "object" && obj.url && typeof obj.url === "string") return obj.url;
                return null;
              };
              const foundUrl = checkImage(item.image);
              if (foundUrl && !imageUrl) {
                imageUrl = foundUrl;
              }
            }
          }
        }
      } catch {
        // Ignore invalid JSON-LD
      }
    }

    // 6. Fallbacks for Amazon price matching
    if (!price) {
      const priceWholeRegex = /<span class="a-price-whole">([^<]+)/i;
      const offscreenPriceRegex = /<span class="a-offscreen">[^<]*?([\d,.]+)/i;
      const priceWholeMatch = html.match(priceWholeRegex);
      const offscreenPriceMatch = html.match(offscreenPriceRegex);
      
      if (priceWholeMatch && priceWholeMatch[1]) {
        price = priceWholeMatch[1];
      } else if (offscreenPriceMatch && offscreenPriceMatch[1]) {
        price = offscreenPriceMatch[1];
      }
    }

    // 7. Fallback search for common e-commerce image classes or tags
    if (!imageUrl) {
      const imgRegex = /<img[^>]*src=["']([^"']+(?:jpg|jpeg|png|webp))["'][^>]*class=["'][^"']*(?:product|detail|main-image|primary)[^"']*["']/i;
      const fallbackMatch = html.match(imgRegex);
      if (fallbackMatch && fallbackMatch[1]) {
        imageUrl = fallbackMatch[1];
      }
    }

    // 8. General fallback for Amazon image CDN URLs
    if (!imageUrl) {
      const generalImgRegex = /https:\/\/[^"'\s<>]+?\/images\/I\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp)/gi;
      const allImages = html.match(generalImgRegex) || [];
      const cleanImg = allImages.find(img => !img.includes("_SS") && !img.includes("_SX38") && !img.includes("_SX50") && !img.includes("_SY50") && !img.includes("play-icon"));
      if (cleanImg) {
        imageUrl = cleanImg;
      } else if (allImages.length > 0 && allImages[0]) {
        imageUrl = allImages[0];
      }
    }

    // Decode and sanitize everything
    title = decodeEntities(title);
    brand = decodeEntities(brand);
    description = decodeEntities(description);
    price = price ? price.replace(/[^\d.]/g, "") : "";

    // Brand heuristic from title/specs
    if (!brand && title) {
      const commonBrands = [
        "Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Samsung", "Logitech", 
        "Canon", "Sony", "Microsoft", "Intel", "AMD", "Nvidia", "LG", "Xiaomi", "OnePlus"
      ];
      for (const b of commonBrands) {
        if (new RegExp("\\b" + b + "\\b", "i").test(title)) {
          brand = b;
          break;
        }
      }
    }

    // Normalize relative URLs for image
    if (imageUrl) {
      imageUrl = decodeEntities(imageUrl);
      if (imageUrl.startsWith("//")) {
        const parsed = new URL(url);
        imageUrl = parsed.protocol + imageUrl;
      } else if (imageUrl.startsWith("/")) {
        const parsed = new URL(url);
        imageUrl = parsed.origin + imageUrl;
      }
    }

    return NextResponse.json({
      imageUrl,
      title,
      brand,
      price,
      description
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
