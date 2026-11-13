import { NextResponse } from "next/server";

let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

export async function GET() {
  const now = Date.now();

  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cache);
  }

  try {
    const apiKey = process.env.THERUNDOWN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    // Hard-coded good dates for this week so we don't hit rate limits
    const dates = ["2026-11-16", "2026-11-15", "2026-11-13"];

    const allEvents = [];

    for (const date of dates) {
      const url = `https://therundown.io/api/v2/sports/2/events/${date}?market_ids=2&main_line=true&affiliate_ids=19,22,23`;
      const res = await fetch(url, {
        headers: { "X-TheRundown-Key": apiKey },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.events?.length) {
          allEvents.push(...data.events);
        }
      }

      // Small delay so we don't hit the 1 req/sec limit
      await new Promise((r) => setTimeout(r, 1200));
    }

    const result = { events: allEvents };
    cache = result;
    cacheTime = now;

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}