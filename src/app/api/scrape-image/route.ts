import { NextResponse } from "next/server";

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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch webpage" }, { status: 500 });
    }

    const html = await response.text();

    let imageUrl = "";

    // 1. Look for og:image
    const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
    const ogImageRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;
    
    // 2. Look for twitter:image
    const twitterImageRegex = /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i;
    const twitterImageRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i;

    let match = html.match(ogImageRegex) || html.match(ogImageRegexAlt) || html.match(twitterImageRegex) || html.match(twitterImageRegexAlt);

    if (match && match[1]) {
      imageUrl = match[1];
    } else {
      // 3. Try parsing JSON-LD scripts
      const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let jsonLdMatch;
      while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
        try {
          const data = JSON.parse(jsonLdMatch[1]);
          // Handle nested image objects/arrays in Schema.org
          if (data) {
            const checkImage = (obj: any): string | null => {
              if (!obj) return null;
              if (typeof obj === "string") return obj;
              if (Array.isArray(obj) && obj.length > 0) return checkImage(obj[0]);
              if (typeof obj === "object" && obj.url && typeof obj.url === "string") return obj.url;
              return null;
            };

            const foundUrl = checkImage(data.image) || (data["@graph"] && Array.isArray(data["@graph"]) && checkImage(data["@graph"].find((item: any) => item.image)?.image));
            if (foundUrl) {
              imageUrl = foundUrl;
              break;
            }
          }
        } catch {
          // Ignore invalid JSON-LD
        }
      }
    }

    // 4. Fallback search for common e-commerce image classes or tags if nothing found
    if (!imageUrl) {
      const imgRegex = /<img[^>]*src=["']([^"']+(?:jpg|jpeg|png|webp))["'][^>]*class=["'][^"']*(?:product|detail|main-image|primary)[^"']*["']/i;
      const fallbackMatch = html.match(imgRegex);
      if (fallbackMatch && fallbackMatch[1]) {
        imageUrl = fallbackMatch[1];
      }
    }

    if (imageUrl) {
      // Decode HTML entities
      imageUrl = imageUrl
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Handle relative URLs
      if (imageUrl.startsWith("//")) {
        const parsed = new URL(url);
        imageUrl = parsed.protocol + imageUrl;
      } else if (imageUrl.startsWith("/")) {
        const parsed = new URL(url);
        imageUrl = parsed.origin + imageUrl;
      }

      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ error: "No product image found on site" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
