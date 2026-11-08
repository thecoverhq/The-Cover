"use client";

import { useEffect, useState } from "react";

const FAKE_USERS = [
  "BetKing", "SharpShooter", "LineSniper", "CoverKing", "Underdog",
  "ChalkEater", "ValueHunter", "LockSmith", "FadeMachine", "ATSBoss",
  "PointSpread", "Moneyline", "TotalGuy", "HomeDog", "RoadWarrior",
  "PrimeTime", "SundaySpecial", "ThursdayNight", "MondayNight", "Wildcard",
  "PlayoffBound", "SuperBowl", "Dynasty", "Rebuild", "Contender",
  "Pretender", "DarkHorse", "Favorite", "LongShot", "SafeBet",
  "RiskyPick", "Bankroll", "UnitBet", "HalfPoint", "KeyNumber",
  "ClosingLine", "OpeningLine", "LineMove", "SteamMove", "SharpMoney",
  "PublicFade", "Contrarian", "ModelPick", "DataDriven", "GutFeel",
  "HomerPick", "Visitor", "Neutral", "WeatherGuy", "InjuryReport"
];

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPicks, setUserPicks] = useState(null);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => {
        const events = data.events || [];
        setGames(events);

        if (!userPicks && events.length > 0) {
          const picks = {};
          FAKE_USERS.forEach((user) => {
            picks[user] = {};
            events.forEach((game) => {
              picks[user][game.event_id] = Math.random() > 0.5 ? "home" : "away";
            });
          });
          setUserPicks(picks);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/games")
        .then((res) => res.json())
        .then((data) => setGames(data.events || []))
        .catch(() => {});
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  function getTeamSpread(game, isHome) {
    const spreadMarket = game.markets?.find((m) => m.market_id === 2);
    if (!spreadMarket) return null;
    const team = game.teams?.find((t) => (isHome ? t.is_home : t.is_away));
    if (!team) return null;
    const participant = spreadMarket.participants?.find(
      (p) => p.type === "TYPE_TEAM" && p.id === team.team_id
    );
    if (!participant) return null;
    const mainLine = participant.lines?.find((line) =>
      Object.values(line.prices || {}).some((p) => p.is_main_line)
    );
    const line = mainLine || participant.lines?.[0];
    return line?.value || null;
  }

  function getFavoriteSpread(game) {
    const homeSpread = getTeamSpread(game, true);
    const awaySpread = getTeamSpread(game, false);
    const homeNum = parseFloat(homeSpread);
    const awayNum = parseFloat(awaySpread);

    if (!isNaN(homeNum) && homeNum < 0) return { team: "home", spread: homeSpread };
    if (!isNaN(awayNum) && awayNum < 0) return { team: "away", spread: awaySpread };
    return null;
  }

  function isLineLocked() {
    const now = new Date();
    const easternNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const day = easternNow.getDay();
    const daysSinceThursday = (day + 3) % 7;
    const thursday = new Date(easternNow);
    thursday.setDate(easternNow.getDate() - daysSinceThursday);
    thursday.setHours(18, 0, 0, 0);
    if (easternNow < thursday) thursday.setDate(thursday.getDate() - 7);
    return easternNow >= thursday;
  }

  function hasGameStarted(game) {
    if (!game.event_date) return false;
    return Date.now() >= new Date(game.event_date).getTime();
  }

  function getCoverResult(game) {
    if (game.score?.event_status !== "STATUS_FINAL") return null;
    const homeSpread = getTeamSpread(game, true);
    if (!homeSpread) return null;
    const scoreAway = Number(game.score?.score_away);
    const scoreHome = Number(game.score?.score_home);
    if (isNaN(scoreAway) || isNaN(scoreHome)) return null;
    const spread = parseFloat(homeSpread);
    if (isNaN(spread)) return null;
    const margin = scoreHome - scoreAway;
    const cover = margin + spread;
    if (cover > 0) return "home";
    if (cover < 0) return "away";
    return "push";
  }

  function calculateLeaderboard() {
    if (!userPicks) return [];

    return FAKE_USERS.map((user) => {
      let units = 0;
      games.forEach((game) => {
        if (!hasGameStarted(game)) return;
        const pick = userPicks[user]?.[game.event_id];
        if (!pick) return;
        const result = getCoverResult(game);
        if (!result || result === "push") return;
        if (result === pick) units += 0.91;
        else units -= 1;
      });
      return { user, units: Number(units.toFixed(2)) };
    }).sort((a, b) => b.units - a.units);
  }

  const locked = isLineLocked();
  const leaderboard = calculateLeaderboard();

  return (
    <main style={{ padding: "24px 16px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: "4px", fontSize: "26px" }}>The Cover</h1>
      <p style={{ color: "#666", marginBottom: "4px" }}>Live Against The Spread Tracker</p>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
        Lines lock Thursday at 6:00 PM ET
      </p>

      <div style={{ marginBottom: "20px" }}>
        <a href="/picks" style={{ color: "#4ade80", fontWeight: "600" }}>
          Make Your Picks →
        </a>
      </div>

      {loading && <p>Loading...</p>}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "center",
          marginBottom: "40px",
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

          return (
            <div
              key={game.event_id}
              style={{
                borderRadius: "10px",
                padding: "14px 16px",
                width: "min(280px, 100%)",
                background: "#111",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px" }}>
                {awayTeam?.abbreviation && (
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${awayTeam.abbreviation.toLowerCase()}.png`}
                    alt={away}
                    style={{ width: "22px", height: "22px" }}
                  />
                )}
                {away} {scoreAway}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "bold",
                  fontSize: "15px",
                  margin: "4px 0 10px",
                  background: "#1e3a2f",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                {homeTeam?.abbreviation && (
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${homeTeam.abbreviation.toLowerCase()}.png`}
                    alt={home}
                    style={{ width: "22px", height: "22px" }}
                  />
                )}
                {home} {scoreHome}
              </div>

              <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "8px" }}>{status}</div>

              {favorite ? (
                <div style={{ fontSize: "13px", lineHeight: "1.45" }}>
                  <div>
                    <strong>{favorite.team === "home" ? home : away}</strong> {favorite.spread}
                  </div>
                  {locked && !cover && (
                    <div style={{ color: "#4ade80", marginTop: "6px", fontWeight: "600" }}>
                      Locked
                    </div>
                  )}
                  {cover && cover !== "push" && (
                    <div style={{ marginTop: "8px", fontWeight: "600", color: "#4ade80" }}>
                      {cover === "home" ? home : away} covered
                    </div>
                  )}
                  {cover === "push" && (
                    <div style={{ marginTop: "8px", color: "#fbbf24", fontWeight: "600" }}>
                      Push
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#666" }}>Spread not available</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Leaderboard</h2>
        <div style={{ background: "#111", borderRadius: "10px", color: "#fff" }}>
          {leaderboard.length === 0 && (
            <div style={{ padding: "14px", color: "#888" }}>No results yet</div>
          )}
          {leaderboard.slice(0, 10).map((entry, i) => (
            <div
              key={entry.user}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "1px solid #222",
                fontSize: "14px",
              }}
            >
              <span>
                {i + 1}. {entry.user}
              </span>
              <span style={{ color: entry.units >= 0 ? "#4ade80" : "#f87171" }}>
                {entry.units > 0 ? "+" : ""}
                {entry.units}u
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}