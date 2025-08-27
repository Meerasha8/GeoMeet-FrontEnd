import { useEffect, useMemo, useState } from "react";
import {
  createRoom,
  joinRoom,
  pushLocation,
  getLocations,
  findVenues,
} from "./api";

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  const [displayName, setDisplayName] = useState("");
  const [createPw, setCreatePw] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinPw, setJoinPw] = useState("");

  const [currentRoom, setCurrentRoom] = useState("");
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);

  const [venuesVisible, setVenuesVisible] = useState(false);
  const [venues, setVenues] = useState([]);

  const clientId = useMemo(() => {
    const saved = localStorage.getItem("geomeet_clientId");
    if (saved) return saved;
    const id = uuidv4();
    localStorage.setItem("geomeet_clientId", id);
    return id;
  }, []);

  // If URL contains ?room=... &pw=... pre-fill join inputs
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const r = qp.get("room");
    const pw = qp.get("pw");
    if (r) setJoinRoomId(r);
    if (pw) setJoinPw(pw);
  }, []);

  // Poll room members every 3s
  useEffect(() => {
    if (!currentRoom) return;
    let t = null;
    const poll = async () => {
      try {
        const data = await getLocations(currentRoom);
        setMembers(data.members || []);
        const active = (data.members || []).filter(m => m.lat && m.lon);
        if (active.length < 2) setStatus("Waiting for at least 2 participants…");
        else if (active.length > 5) setStatus("Max 5 participants exceeded.");
        else setStatus(`Ready: ${active.length} sharing.`);
      } catch (e) {
        // ignore intermittent errors
      }
      t = setTimeout(poll, 3000);
    };
    poll();
    return () => t && clearTimeout(t);
  }, [currentRoom]);

  function roomLink(roomId, pw) {
    const u = new URL(location.href);
    u.searchParams.set("room", roomId);
    if (pw) u.searchParams.set("pw", pw);
    return u.toString();
  }

  async function onCreateRoom(e) {
    e.preventDefault();
    setLoading(true);
    setVenuesVisible(false);
    try {
      const data = await createRoom(createPw);
      setCurrentRoom(data.roomId);
      setStatus("Room created. Join it now.");
      alert(`Room created!\nShare this link:\n${roomLink(data.roomId, createPw || "")}`);
      // Auto-join as creator
      await joinRoom(data.roomId, clientId, displayName || "Guest", createPw || "");
      setStatus("Joined room. Click “Share My Location”.");
    } catch (err) {
      alert("Create room failed:\n" + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onJoinRoom(e) {
    e.preventDefault();
    setLoading(true);
    setVenuesVisible(false);
    try {
      await joinRoom(joinRoomId.trim(), clientId, displayName || "Guest", joinPw || "");
      setCurrentRoom(joinRoomId.trim());
      setStatus("Joined room. Click “Share My Location”.");
    } catch (err) {
      alert("Join failed:\n" + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function shareOnce() {
    if (!currentRoom) return alert("Create or join a room first.");
    if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
    setLoading(true);
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            await pushLocation(currentRoom, clientId, displayName || "Guest", lat, lon);
            resolve();
          },
          err => reject(err),
          { enableHighAccuracy: false, maximumAge: 5000, timeout: 8000 }
        );
      });
      setStatus("Location shared (one-time). Keep window open and click again to update.");
    } catch (e) {
      alert("Failed to share location:\n" + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function onFindVenues() {
    if (!currentRoom) return alert("Join a room first.");
    setLoading(true);
    setVenuesVisible(false);
    try {
      const data = await getLocations(currentRoom);
      const sharing = (data.members || []).filter(m => m.lat && m.lon);
      if (sharing.length < 2) {
        alert("Need at least 2 participants sharing locations.");
        return;
      }
      if (sharing.length > 5) {
        alert("Max 5 participants.");
        return;
      }
      const locations = sharing.map(m => [Number(m.lat), Number(m.lon)]);
      const query = prompt('Venue type (e.g. "hospital", "restaurant"):', "hospital") || "hospital";
      const radius = parseInt(prompt("Radius in meters:", "1000") || "1000", 10) || 1000;

      const results = await findVenues(query, radius, locations);
      setVenues(results || []);
      setVenuesVisible(true);
      setStatus("Venues loaded.");
    } catch (e) {
      alert("Failed to get venues:\n" + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      {/* Loading overlay */}
      {loading && (
        <div className="overlay">
          <div className="spinner" />
          <div className="overlay-text">Working…</div>
        </div>
      )}

      <header>
        <h1>GeoMeet</h1>
        <div className="sub">No login • Share a link/password • 2–5 people</div>
      </header>

      <section className="card">
        <div className="row">
          <div className="col">
            <label>Display name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Alice"
            />
          </div>
        </div>

        <div className="grid">
          <form className="col" onSubmit={onCreateRoom}>
            <h3>Create a room</h3>
            <input
              type="password"
              placeholder="Password (optional)"
              value={createPw}
              onChange={e => setCreatePw(e.target.value)}
            />
            <button className="primary" type="submit">Create & Get Link</button>
          </form>

          <form className="col" onSubmit={onJoinRoom}>
            <h3>Join a room</h3>
            <input
              placeholder="Room ID"
              value={joinRoomId}
              onChange={e => setJoinRoomId(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (if any)"
              value={joinPw}
              onChange={e => setJoinPw(e.target.value)}
            />
            <button type="submit">Join Room</button>
          </form>
        </div>

        {currentRoom && (
          <div className="room-info">
            <div><b>Room:</b> {currentRoom}</div>
            <div className="small">
              Share link: <span className="mono">{location.origin + `/?room=${currentRoom}${createPw || joinPw ? `&pw=${createPw || joinPw}` : ""}`}</span>
            </div>

            <div className="actions">
              <button onClick={shareOnce}>Share My Location</button>
              <button className="primary" onClick={onFindVenues}>Find Venues</button>
            </div>

            <div className="status">{status}</div>

            <div>
              <label>Members</label>
              <div className="chips">
                {members.map(m => (
                  <div className="chip" key={m.clientId}>
                    {(m.name || "Guest")}{" "}
                    {m.lat && m.lon ? `(${Number(m.lat).toFixed(4)}, ${Number(m.lon).toFixed(4)})` : "(no loc)"}
                  </div>
                ))}
                {members.length === 0 && <div className="muted small">No members yet.</div>}
              </div>
            </div>
          </div>
        )}
      </section>

      {venuesVisible && (
        <section className="card">
          <h3>Suggested Venues</h3>
          {venues.length === 0 ? (
            <div className="muted">No results.</div>
          ) : (
            <div className="venue-list">
              {venues.map((v, i) => (
                <div className="venue" key={i}>
                  <div className="venue-name">{v.name}</div>
                  <div className="venue-sub">
                    {(v.category || "Venue")} • {v.address || "Address unavailable"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer>Tip: Geolocation only works on HTTPS (or localhost).</footer>

      {/* styles */}
      <style>{`
        :root{--bg:#f7fafc;--card:#fff;--ink:#0f172a;--muted:#6b7280;--accent:#2563eb}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,Arial,sans-serif}
        .wrap{max-width:960px;margin:24px auto;padding:16px}
        header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
        h1{margin:0;font-size:22px}
        .sub{color:var(--muted);font-size:13px}
        .card{background:var(--card);border-radius:14px;box-shadow:0 8px 24px rgba(2,6,23,.06);padding:16px;margin-top:12px}
        label{display:block;font-size:12px;color:#374151;margin-bottom:6px}
        input{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px}
        button{padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
        button.primary{background:var(--accent);color:#fff;border:none}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .col{display:flex;flex-direction:column;gap:8px}
        .row{display:flex;gap:12px}
        .room-info{margin-top:10px;display:flex;flex-direction:column;gap:10px}
        .actions{display:flex;gap:8px;flex-wrap:wrap}
        .status{font-size:13px;color:var(--muted)}
        .chips{display:flex;gap:8px;flex-wrap:wrap}
        .chip{background:#eef2ff;padding:8px 10px;border-radius:999px;font-size:13px}
        .venue-list{display:grid;gap:10px}
        .venue{background:#fff;border:1px solid #eef1f4;border-radius:12px;padding:12px}
        .venue-name{font-weight:600}
        .venue-sub{font-size:13px;color:var(--muted)}
        .muted{color:var(--muted)}
        .small{font-size:12px}
        .mono{font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
        footer{margin:16px 0;color:var(--muted);font-size:12px}

        /* Loading overlay */
        .overlay{position:fixed;inset:0;background:rgba(15,23,42,.35);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:50}
        .overlay-text{margin-top:10px;color:#fff}
        .spinner{width:48px;height:48px;border-radius:50%;border:4px solid #e5e7eb;border-top-color:var(--accent);animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        @media (max-width:720px){.grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
