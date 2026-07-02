import { BASELINE_DATE } from "./league";

// Yahoo Finance uses dashes instead of dots for share classes.
const SYMBOL_OVERRIDES = { "BRK.B": "BRK-B" };

function toEasternDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

// Fetches the current price and the baseline close for one symbol.
// Returns { symbol, name, price, baselinePrice, change, pctChange } or
// { symbol, error } if the lookup failed.
export async function fetchQuote(symbol) {
  const yahooSymbol = SYMBOL_OVERRIDES[symbol] ?? symbol;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(yahooSymbol)}?range=3mo&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; 757-stock-tracker)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(data?.chart?.error?.description ?? "no data");

    const meta = result.meta;
    const price = meta.regularMarketPrice;

    // Baseline = last available close on or before BASELINE_DATE (ET).
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    let baselinePrice = null;
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      if (toEasternDate(timestamps[i]) <= BASELINE_DATE) {
        baselinePrice = closes[i];
      } else {
        break;
      }
    }

    if (price == null || baselinePrice == null) {
      throw new Error("missing price data");
    }

    return {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      baselinePrice,
      change: price - baselinePrice,
      pctChange: ((price - baselinePrice) / baselinePrice) * 100,
    };
  } catch (err) {
    return { symbol, error: String(err.message ?? err) };
  }
}

export async function fetchAllQuotes(picks) {
  const quotes = await Promise.all(
    picks.map(async (pick) => ({ ...pick, ...(await fetchQuote(pick.symbol)) }))
  );
  // Highest gain first; failed lookups sink to the bottom.
  return quotes.sort((a, b) => (b.pctChange ?? -Infinity) - (a.pctChange ?? -Infinity));
}
