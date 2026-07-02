import { LEAGUE_NAME, BASELINE_DATE, PICKS } from "../lib/league";
import { fetchAllQuotes } from "../lib/quotes";
import Chat from "./Chat";

// Re-fetch prices at most every 5 minutes.
export const revalidate = 300;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const baselineLabel = new Date(BASELINE_DATE + "T12:00:00").toLocaleDateString(
  "en-US",
  { month: "short", day: "numeric" }
);

function ChangeCell({ change, pctChange, baselinePrice }) {
  const cls = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const sign = change > 0 ? "+" : "";
  return (
    <>
      <span className={cls}>
        {sign}
        {usd.format(change)} ({sign}
        {pctChange.toFixed(2)}%)
      </span>
      <span className="baseline">
        started {usd.format(baselinePrice)} on {baselineLabel}
      </span>
    </>
  );
}

export default async function Page() {
  const rows = await fetchAllQuotes(PICKS);
  const updatedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="page">
      <header>
        <h1>🏈 {LEAGUE_NAME}</h1>
        <p className="subtitle">
          Stock Leaderboard · gains since{" "}
          {new Date(BASELINE_DATE + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </header>

      <div className="layout">
        <section className="board">
          <table>
            <thead>
              <tr>
                <th className="rank">#</th>
                <th>Member</th>
                <th>Stock</th>
                <th className="num">Price</th>
                <th className="num">Change since {baselineLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.symbol} className={i === 0 && !row.error ? "leader" : ""}>
                  <td className="rank">{row.error ? "—" : i + 1}</td>
                  <td>{row.member}</td>
                  <td>
                    <span className="symbol">{row.symbol}</span>
                    <span className="name">{row.error ? "price unavailable" : row.name}</span>
                  </td>
                  <td className="num">{row.error ? "—" : usd.format(row.price)}</td>
                  <td className="num">
                    {row.error ? (
                      "—"
                    ) : (
                      <ChangeCell
                        change={row.change}
                        pctChange={row.pctChange}
                        baselinePrice={row.baselinePrice}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer>Prices update every 5 minutes · Last updated {updatedAt} ET</footer>
        </section>

        <aside className="chatpane">
          <Chat />
        </aside>
      </div>
    </main>
  );
}
