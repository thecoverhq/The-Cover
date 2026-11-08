import { NextResponse } from "next/server";

let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const now = Date.now();

  // Return cached data if it's still fresh
  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cache);
  }

  try {
    const apiKey = process.env.THERUNDOWN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });

    const url = `https://therundown.io/api/v2/sports/2/events/${today}?market_ids=2&main_line=true&affiliate_ids=19,22,23`;

    const res = await fetch(url, {
      headers: {
        "X-TheRundown-Key": apiKey,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();

    // Save to cache
    cache = data;
    cacheTime = now;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}