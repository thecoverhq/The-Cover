let cachedData = null;
let lastFetched = 0;

export async function GET() {
  const apiKey = process.env.THERUNDOWN_API_KEY;
  const now = Date.now();

  // Cache for 2 minutes
  if (cachedData && now - lastFetched < 2 * 60 * 1000) {
    return Response.json(cachedData);
  }

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  // Ask for main spreads only from the free books
  const url = `https://therundown.io/api/v2/sports/2/events/${today}?market_ids=2&main_line=true&affiliate_ids=19,22,23`;

  const response = await fetch(url, {
    headers: {
      "X-TheRundown-Key": apiKey,
    },
  });

  const data = await response.json();

  cachedData = data;
  lastFetched = now;

  return Response.json(data);
}