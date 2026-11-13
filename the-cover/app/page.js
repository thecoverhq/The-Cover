"use client";

import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lockedSpreads, setLockedSpreads] = useState({});

  function isSpreadLocked() {
    const now = new Date();
    const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = easternNow.getDay();
    const daysSinceThursday = (day + 3) % 7;
    const thursday = new Date(easternNow);
    thursday.setDate(easternNow.getDate() - daysSinceThursday);
    thursday.setHours(0, 0, 0, 0);
    if (easternNow < thursday) thursday.setDate(thursday.getDate() - 7);
    return easternNow >= thursday;
  }

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => {
        let events = data.events || [];
        events = events.filter((g) => {
          if (!g.event_date) return true;
          const d = new Date(g.event_date);
          const eastern = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
          return eastern.getDay() !== 4;
        });

        if (isSpreadLocked()) {
          const saved = JSON.parse(localStorage.getItem("thecover_locked_spreads") || "{}");
          const next = { ...saved };
          events.forEach((game) => {
            if (!next[game.event_id]) {
              const fav = getFavoriteSpread(game);
              if (fav) next[game.event_id] = fav;
            }
          });
          setLockedSpreads(next);
          localStorage.setItem("thecover_locked_spreads", JSON.stringify(next));
        }

        setGames(events);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/games")
        .then((res) => res.json())
        .then((data) => {
          let events = data.events || [];
          events = events.filter((g) => {
            if (!g.event_date) return true;
            const d = new Date(g.event_date);
            const eastern = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
            return eastern.getDay() !== 4;
          });
          setGames(events);
        })
        .catch(() => {});
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  function getFavoriteSpread(game) {
    if (isSpreadLocked() && lockedSpreads[game.event_id]) {
      return lockedSpreads[game.event_id];
    }

    const market = game.markets?.find((m) => m.market_id === 2);
    if (!market?.participants) return null;

    const homeTeam = game.teams?.find((t) => t.is_home);
    const awayTeam = game.teams?.find((t) => t.is_away);
    if (!homeTeam || !awayTeam) return null;

    let homeSpread = null;
    let awaySpread = null;

    for (const p of market.participants) {
      if (p.type !== "TYPE_TEAM") continue;
      const lines = p.lines || [];
      if (!lines.length) continue;

      const main = lines.find((l) =>
        Object.values(l.prices || {}).some((pr) => pr.is_main_line)
      ) || lines[0];

      const value = main?.value;
      if (value == null) continue;

      if (String(p.id) === String(homeTeam.team_id)) homeSpread = value;
      if (String(p.id) === String(awayTeam.team_id)) awaySpread = value;
    }

    const homeNum = parseFloat(homeSpread);
    const awayNum = parseFloat(awaySpread);

    if (!isNaN(homeNum) && homeNum < 0) {
      return { team: "home", spread: homeSpread, name: homeTeam.name };
    }
    if (!isNaN(awayNum) && awayNum < 0) {
      return { team: "away", spread: awaySpread, name: awayTeam.name };
    }
    return null;
  }

  function getCoverResult(game) {
    if (game.score?.event_status !== "STATUS_FINAL") return null;
    const fav = getFavoriteSpread(game);
    if (!fav) return null;

    const scoreAway = Number(game.score?.score_away);
    const scoreHome = Number(game.score?.score_home);
    if (isNaN(scoreAway) || isNaN(scoreHome)) return null;

    const spread = parseFloat(fav.spread);
    if (isNaN(spread)) return null;

    const margin = fav.team === "home" ? scoreHome - scoreAway : scoreAway - scoreHome;
    const cover = margin + spread;

    if (cover > 0) return fav.team;
    if (cover < 0) return fav.team === "home" ? "away" : "home";
    return "push";
  }

  return (
    <main style={{ padding: "32px 16px", fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ marginBottom: "6px", fontSize: "32px", fontWeight: "700" }}>The Cover</h1>
        <p style={{ color: "#aaa", marginBottom: "4px" }}>Live Against The Spread Tracker</p>
        <p style={{ color: "#777", fontSize: "14px", marginBottom: "28px" }}>
          Spreads lock at midnight ET every Thursday. You can change your pick until that game kicks off. Thursday games are not included.
        </p>

        <div style={{ marginBottom: "24px" }}>
          <a href="/picks" style={{ color: "#4ade80", fontWeight: "600", textDecoration: "none" }}>
            Make Your Picks →
          </a>
        </div>

        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center", gap: "10px" }}>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button style={{ padding: "8px 16px", background: "#111", color: "#fff", border: "1px solid #333", borderRadius: "6px", cursor: "pointer" }}>
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button style={{ padding: "8px 16px", background: "#4ade80", color: "#111", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>

        {loading && <p>Loading...</p>}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            justifyContent: "center",
            marginBottom: "48px",
          }}
        >
          {games.map((game) => {
            const awayTeam = game.teams?.find((t) => t.is_away);
            const homeTeam = game.teams?.find((t) => t.is_home);
            const away = awayTeam?.name || "Away";
            const home = homeTeam?.name || "Home";
            const scoreAway = game.score?.score_away ?? "-";
            const scoreHome = game.score?.score_home ?? "-";
            const status = game.score?.event_status_detail || game.score?.event_status || "";
            const favorite = getFavoriteSpread(game);
            const cover = getCoverResult(game);
            const isFinal = game.score?.event_status === "STATUS_FINAL";

            let borderColor = "#222";
            if (isFinal && cover && cover !== "push") {
              borderColor = cover === favorite?.team ? "#4ade80" : "#f87171";
            }

            return (
              <div
                key={game.event_id}
                style={{
                  borderRadius: "12px",
                  padding: "16px",
                  width: "min(280px, 100%)",
                  background: "#111",
                  border: `2px solid ${borderColor}`,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "15px" }}>
                  {awayTeam?.abbreviation && (
                    <img
                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${awayTeam.abbreviation.toLowerCase()}.png`}
                      alt=""
                      style={{ width: "22px", height: "22px" }}
                    />
                  )}
                  {away} <span style={{ marginLeft: "auto" }}>{scoreAway}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: "600",
                    fontSize: "15px",
                    margin: "6px 0 10px",
                    background: "#1e3a2f",
                    padding: "6px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {homeTeam?.abbreviation && (
                    <img
                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${homeTeam.abbreviation.toLowerCase()}.png`}
                      alt=""
                      style={{ width: "22px", height: "22px" }}
                    />
                  )}
                  {home} <span style={{ marginLeft: "auto" }}>{scoreHome}</span>
                </div>

                <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px" }}>{status}</div>

                {favorite ? (
                  <div style={{ fontSize: "13px", lineHeight: "1.45" }}>
                    <div>
                      <strong>{favorite.name}</strong> {favorite.spread}
                    </div>
                    {isFinal && cover && cover !== "push" && (
                      <div style={{ marginTop: "8px", fontWeight: "600", color: cover === favorite.team ? "#4ade80" : "#f87171" }}>
                        {cover === favorite.team ? "Covered" : "Did not cover"}
                      </div>
                    )}
                    {isFinal && cover === "push" && (
                      <div style={{ marginTop: "8px", color: "#fbbf24", fontWeight: "600" }}>
                        Push
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#555" }}>Spread not available</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth: "420px", margin: "0 auto", textAlign: "left" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "12px", textAlign: "center" }}>Leaderboard</h2>
          <div style={{ background: "#111", borderRadius: "12px", border: "1px solid #222", padding: "20px", textAlign: "center", color: "#666" }}>
            No users yet. Invite friends to start the leaderboard.
          </div>
        </div>
      </div>
    </main>
  );
}