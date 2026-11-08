"use client";

import { useEffect, useState } from "react";

export default function PicksPage() {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState({});
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.events || []));

    const savedName = localStorage.getItem("cover_username");
    const savedPicks = localStorage.getItem("cover_picks");
    if (savedName) setUsername(savedName);
    if (savedPicks) setPicks(JSON.parse(savedPicks));
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

  function handlePick(gameId, side) {
    const newPicks = { ...picks, [gameId]: side };
    setPicks(newPicks);
    localStorage.setItem("cover_picks", JSON.stringify(newPicks));
  }

  function handleUsernameChange(e) {
    const name = e.target.value;
    setUsername(name);
    localStorage.setItem("cover_username", name);
  }

  function submitPicks() {
    if (!username.trim()) {
      alert("Please enter a username first");
      return;
    }
    setSubmitted(true);
  }

  return (
    <main
      style={{
        padding: "24px 16px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        background: "#f5f5f7",
        minHeight: "100vh",
      }}
    >
      <a href="/" style={{ color: "#4ade80", fontSize: "14px" }}>
        ← Back to Games
      </a>

      <h1 style={{ marginTop: "12px", marginBottom: "8px", color: "#111" }}>
        Make Your Picks
      </h1>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "6px", color: "#333", fontSize: "14px" }}>
          Your username
        </label>
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Enter a username"
          style={{
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "100%",
            maxWidth: "280px",
            fontSize: "15px",
            color: "#111",
            background: "#fff",
          }}
        />
      </div>

      {games.map((game) => {
        const awayTeam = game.teams?.find((t) => t.is_away);
        const homeTeam = game.teams?.find((t) => t.is_home);
        const away = awayTeam?.name || "Away";
        const home = homeTeam?.name || "Home";
        const selected = picks[game.event_id];
        const favorite = getFavoriteSpread(game);

        return (
          <div
            key={game.event_id}
            style={{
              background: "#111",
              color: "#fff",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontWeight: "600" }}>
                {away} @ {home}
              </div>
              {favorite && (
                <div style={{ fontSize: "13px", color: "#4ade80" }}>
                  {favorite.team === "home" ? home : away} {favorite.spread}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handlePick(game.event_id, "away")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: selected === "away" ? "2px solid #4ade80" : "1px solid #333",
                  background: selected === "away" ? "#14532d" : "#1f1f1f",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {awayTeam?.abbreviation && (
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${awayTeam.abbreviation.toLowerCase()}.png`}
                    alt={away}
                    style={{ width: "20px", height: "20px" }}
                  />
                )}
                {away}
              </button>
              <button
                onClick={() => handlePick(game.event_id, "home")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: selected === "home" ? "2px solid #4ade80" : "1px solid #333",
                  background: selected === "home" ? "#14532d" : "#1f1f1f",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {homeTeam?.abbreviation && (
                  <img
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${homeTeam.abbreviation.toLowerCase()}.png`}
                    alt={home}
                    style={{ width: "20px", height: "20px" }}
                  />
                )}
                {home}
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={submitPicks}
        style={{
          marginTop: "16px",
          padding: "12px 20px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Submit Picks
      </button>

      {submitted && (
        <p style={{ color: "#4ade80", marginTop: "12px", fontWeight: "600" }}>
          Picks saved for {username}!
        </p>
      )}
    </main>
  );
}