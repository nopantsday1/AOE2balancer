import { useState, useCallback } from "react";

// ─── World's Edge API ────────────────────────────────────────────────────────
const WE_API = "https://aoe-api.worldsedgelink.com/community/leaderboard/GetLeaderBoard";
const CORS_PROXY = "https://corsproxy.io/?";

async function searchWorldsEdge(name) {
  const params = new URLSearchParams({ title: "age2", leaderboard_id: "3", count: "5" });
  params.append("profile_names[]", name);
  const directUrl = `${WE_API}?${params}`;
  let data;
  for (const url of [directUrl, `${CORS_PROXY}${encodeURIComponent(directUrl)}`]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!r.ok) continue;
      data = await r.json();
      break;
    } catch { continue; }
  }
  if (!data) throw new Error("unreachable");
  const entries = data?.leaderboard ?? data?.statGroups ?? data?.result?.leaderboard ?? [];
  return entries
    .filter(e => (e.name || e.alias) && e.rating != null)
    .map(e => ({ name: e.name||e.alias||name, rating: e.rating, rank: e.rank??null, wins: e.wins??null, losses: e.losses??null }));
}

// ─── Civ Database ─────────────────────────────────────────────────────────────
// Each civ has:
//   flankScore  : 0-3 (how good as a flank — archer/inf early agression/raids)
//   pocketScore : 0-3 (how good as pocket — cavalry/eco/siege)
//   counters    : array of unit types this civ counters
//   counteredBy : array of unit types that counter this civ
//   tags        : descriptive strengths
const CIVS = [
  { name:"Aztecs",      flank:3, pocket:1, strengths:["infantry","monk"],   counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Berbers",     flank:1, pocket:3, strengths:["cavalry","camel"],   counters:["cavalry"],      counteredBy:["infantry"],  type:"cavalry"  },
  { name:"Britons",     flank:3, pocket:1, strengths:["archer"],            counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Bulgarians",  flank:2, pocket:2, strengths:["infantry","cavalry"],counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Burgundians", flank:1, pocket:3, strengths:["cavalry","eco"],     counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Burmese",     flank:2, pocket:2, strengths:["infantry","elephant"],counters:["cavalry"],     counteredBy:["archer"],    type:"infantry" },
  { name:"Byzantines",  flank:2, pocket:2, strengths:["mixed","defensive"], counters:["all"],          counteredBy:[],            type:"mixed"    },
  { name:"Celts",       flank:2, pocket:2, strengths:["infantry","siege"],  counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Chinese",     flank:2, pocket:3, strengths:["eco","archer","mixed"],counters:["infantry"],   counteredBy:["cavalry"],   type:"mixed"    },
  { name:"Cumans",      flank:1, pocket:3, strengths:["cavalry","fast"],    counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Dravidians",  flank:3, pocket:1, strengths:["archer","infantry"], counters:["cavalry"],      counteredBy:["cavalry"],   type:"archer"   },
  { name:"Ethiopians",  flank:3, pocket:1, strengths:["archer"],            counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Franks",      flank:1, pocket:3, strengths:["cavalry","eco"],     counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Georgians",   flank:2, pocket:2, strengths:["infantry","cavalry"],counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Goths",       flank:2, pocket:1, strengths:["infantry","spam"],   counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Gurjaras",    flank:2, pocket:3, strengths:["cavalry","camel"],   counters:["cavalry","archer"],counteredBy:["infantry"],type:"cavalry" },
  { name:"Hindustanis", flank:1, pocket:3, strengths:["camel","eco"],       counters:["cavalry"],      counteredBy:["archer"],    type:"mixed"    },
  { name:"Huns",        flank:1, pocket:3, strengths:["cavalry","fast"],    counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Incas",       flank:2, pocket:2, strengths:["infantry","eco"],    counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Indians",     flank:1, pocket:3, strengths:["camel","eco"],       counters:["cavalry"],      counteredBy:["archer"],    type:"mixed"    },
  { name:"Italians",    flank:3, pocket:1, strengths:["archer","gunpowder"],counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Japanese",    flank:3, pocket:1, strengths:["infantry","archer"], counters:["cavalry"],      counteredBy:["cavalry"],   type:"infantry" },
  { name:"Khmer",       flank:1, pocket:3, strengths:["elephant","siege"],  counters:["cavalry"],      counteredBy:["monk"],      type:"cavalry"  },
  { name:"Koreans",     flank:2, pocket:2, strengths:["archer","defensive"],counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Lithuanians", flank:1, pocket:3, strengths:["cavalry","monk"],    counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Magyars",     flank:1, pocket:3, strengths:["cavalry"],           counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Malay",       flank:2, pocket:2, strengths:["infantry","navy"],   counters:["cavalry"],      counteredBy:["archer"],    type:"mixed"    },
  { name:"Malians",     flank:2, pocket:2, strengths:["infantry","eco"],    counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Mayans",      flank:3, pocket:1, strengths:["archer","eco"],      counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Mongols",     flank:2, pocket:3, strengths:["cavalry","siege"],   counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Persians",    flank:1, pocket:3, strengths:["cavalry","eco"],     counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Bohemians",   flank:2, pocket:2, strengths:["gunpowder","monk"],  counters:["cavalry"],      counteredBy:["archer"],    type:"mixed"    },
  { name:"Poles",       flank:1, pocket:3, strengths:["cavalry","eco"],     counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Portuguese",  flank:2, pocket:2, strengths:["gunpowder","eco"],   counters:["mixed"],        counteredBy:["cavalry"],   type:"mixed"    },
  { name:"Romans",      flank:3, pocket:1, strengths:["infantry"],          counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Saracens",    flank:2, pocket:2, strengths:["camel","eco"],       counters:["cavalry"],      counteredBy:["infantry"],  type:"mixed"    },
  { name:"Sicilians",   flank:2, pocket:2, strengths:["infantry","cavalry"],counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Slavs",       flank:2, pocket:2, strengths:["infantry","siege"],  counters:["cavalry"],      counteredBy:["archer"],    type:"infantry" },
  { name:"Spanish",     flank:2, pocket:2, strengths:["gunpowder","eco"],   counters:["mixed"],        counteredBy:["cavalry"],   type:"mixed"    },
  { name:"Tatars",      flank:2, pocket:3, strengths:["cavalry","archer"],  counters:["infantry"],     counteredBy:["camel"],     type:"cavalry"  },
  { name:"Teutons",     flank:1, pocket:2, strengths:["infantry","defensive"],counters:["cavalry"],    counteredBy:["archer"],    type:"infantry" },
  { name:"Turks",       flank:1, pocket:3, strengths:["cavalry","gunpowder"],counters:["infantry"],    counteredBy:["camel"],     type:"cavalry"  },
  { name:"Vietnamese",  flank:3, pocket:1, strengths:["archer","eco"],      counters:["infantry"],     counteredBy:["cavalry"],   type:"archer"   },
  { name:"Vikings",     flank:3, pocket:1, strengths:["infantry","archer"], counters:["cavalry"],      counteredBy:["cavalry"],   type:"infantry" },
  { name:"Armenians",   flank:2, pocket:2, strengths:["cavalry","defensive"],counters:["cavalry"],     counteredBy:["archer"],    type:"cavalry"  },
  { name:"Bengalis",    flank:1, pocket:3, strengths:["elephant","eco"],    counters:["cavalry"],      counteredBy:["monk"],      type:"cavalry"  },
];

const POSITIONS = ["Flank 1","Flank 2","Pocket 1","Pocket 2"];

// ─── Strategic Civ Assignment ─────────────────────────────────────────────────
// Strategy:
// 1. Sort team by rating desc → top 2 get pockets (they need to macro), bottom 2 get flanks
// 2. For flanks: pick civs with high flankScore, avoid pure cavalry civs
// 3. For pockets: pick civs with high pocketScore, avoid pure archer civs
// 4. Cross-team counters: if opposite team has archer-heavy assignment, bias toward cavalry on this team, etc.

function getTeamProfile(team) {
  // What unit types dominate this team's civs?
  const typeCounts = {};
  team.forEach(p => {
    if (!p?.civ) return;
    const t = p.civ.type;
    typeCounts[t] = (typeCounts[t]||0) + 1;
  });
  const dominant = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "mixed";
  return { dominant, typeCounts };
}

// Returns the unit types that counter a given type
const COUNTER_MAP = {
  cavalry:  ["camel","infantry"],
  archer:   ["cavalry","skirmisher"],
  infantry: ["archer","cavalry"],
  mixed:    [],
};

function assignCivsStrategic(team, opposingTeamCivs = []) {
  // Figure out opposing team's dominant type for counter-picking
  const oppTypes = opposingTeamCivs.map(c => c?.type).filter(Boolean);
  const oppDominant = oppTypes.length
    ? Object.entries(oppTypes.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0][0]
    : null;

  // Sort players: higher rating → pocket (index 2,3), lower rating → flank (index 0,1)
  const sorted = [...team]
    .map((p,i)=>({p,i}))
    .filter(x=>x.p)
    .sort((a,b)=>(b.p.rating||1000)-(a.p.rating||1000));

  const posMap = {}; // original index → position
  sorted.forEach(({p,i}, rank) => {
    if (rank < 2) posMap[i] = rank === 0 ? "Pocket 1" : "Pocket 2";
    else          posMap[i] = rank === 2 ? "Flank 1"  : "Flank 2";
  });

  // Build civ pools: filter by role suitability
  const flankPool = CIVS
    .filter(c => c.flank >= c.pocket || c.flank >= 2)
    .sort(() => Math.random() - 0.5);

  const pocketPool = CIVS
    .filter(c => c.pocket >= c.flank || c.pocket >= 2)
    .sort(() => Math.random() - 0.5);

  // Counter bias: if opponent is archer-heavy, prefer cavalry civs for pockets; etc.
  function scoreForRole(civ, role, oppDominant) {
    let score = role === "pocket" ? civ.pocket : civ.flank;
    if (oppDominant) {
      // Bonus if this civ counters the opponent's dominant type
      if (civ.counters.includes(oppDominant)) score += 1.5;
      // Also: avoid civs that are weak against opponent's dominant type
      if (civ.counteredBy.includes(oppDominant)) score -= 1;
    }
    return score + Math.random() * 0.4; // small random jitter for variety
  }

  const used = new Set();
  const result = [...team];

  // Assign pockets first (higher skill players)
  const pocketIndices = sorted.slice(0,2).map(x=>x.i);
  pocketIndices.forEach(idx => {
    if (!team[idx]) return;
    const best = pocketPool
      .filter(c => !used.has(c.name))
      .sort((a,b) => scoreForRole(b,"pocket",oppDominant) - scoreForRole(a,"pocket",oppDominant))[0];
    if (best) {
      used.add(best.name);
      result[idx] = { ...team[idx], position: posMap[idx], civ: best };
    }
  });

  // Assign flanks
  const flankIndices = sorted.slice(2).map(x=>x.i);
  flankIndices.forEach(idx => {
    if (!team[idx]) return;
    // For flanks, try to counter-pick based on OPPOSITE of what pockets are doing
    // If pockets are cavalry-heavy, flanks can be archer or infantry (for diversity too)
    const pocketTypes = pocketIndices.map(pi=>result[pi]?.civ?.type).filter(Boolean);
    const pocketDominant = pocketTypes.length ? pocketTypes[0] : null;
    const best = flankPool
      .filter(c => !used.has(c.name) && c.type !== "cavalry") // flanks never pure cavalry
      .sort((a,b) => scoreForRole(b,"flank",oppDominant) - scoreForRole(a,"flank",oppDominant))[0];
    if (best) {
      used.add(best.name);
      result[idx] = { ...team[idx], position: posMap[idx], civ: best };
    }
  });

  return result;
}

// ─── Team Balancing ───────────────────────────────────────────────────────────
function balanceTeams(players) {
  const s = [...players].sort((a,b)=>(b.rating||1000)-(a.rating||1000));
  const t1=[], t2=[];
  const picks = [0,1,1,0,0,1,1,0]; // snake draft
  s.forEach((p,i) => (picks[i%8]===0 ? t1 : t2).push(p));
  while(t1.length<4) t1.push(null);
  while(t2.length<4) t2.push(null);
  return { team1:t1.slice(0,4), team2:t2.slice(0,4) };
}

function buildResult(team1, team2) {
  // First pass: assign team1 with no opponent info
  const t1 = assignCivsStrategic(team1, []);
  // Second pass: assign team2 knowing team1's civs (for countering)
  const t2 = assignCivsStrategic(team2, t1.map(p=>p?.civ).filter(Boolean));
  // Third pass: re-assign team1 knowing team2 (optional refinement)
  const t1final = assignCivsStrategic(team1, t2.map(p=>p?.civ).filter(Boolean));
  return { team1: t1final, team2: t2 };
}

// ─── Visual Helpers ───────────────────────────────────────────────────────────
const TYPE_S = {
  infantry: { bg:"#FAECE7", text:"#993C1D", border:"#F0997B" },
  cavalry:  { bg:"#E6F1FB", text:"#185FA5", border:"#85B7EB" },
  archer:   { bg:"#EAF3DE", text:"#3B6D11", border:"#97C459" },
  mixed:    { bg:"#F1EFE8", text:"#5F5E5A", border:"#B4B2A9" },
};
const POS_S = {
  "Flank 1":  { bg:"#EEEDFE", text:"#534AB7", border:"#AFA9EC" },
  "Flank 2":  { bg:"#FBEAF0", text:"#993556", border:"#ED93B1" },
  "Pocket 1": { bg:"#FAEEDA", text:"#854F0B", border:"#EF9F27" },
  "Pocket 2": { bg:"#E1F5EE", text:"#0F6E56", border:"#5DCAA5" },
};

function rc(r) {
  if (!r) return "var(--color-text-tertiary)";
  if (r>=2000) return "#D85A30"; if (r>=1600) return "#BA7517";
  if (r>=1200) return "#378ADD"; if (r>=900) return "#1D9E75";
  return "#888780";
}
function rl(r) {
  if (!r) return "—"; if (r>=2000) return "Legend"; if (r>=1600) return "Diamond";
  if (r>=1200) return "Platinum"; if (r>=900) return "Gold"; return "Silver";
}

function Avatar({ name, size=36 }) {
  const h=[...(name||"?")].reduce((a,c)=>(a*31+c.charCodeAt(0))&0xffff,0)%360;
  return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`hsl(${h},42%,88%)`,border:`0.5px solid hsl(${h},42%,72%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:500,color:`hsl(${h},42%,33%)`}}>{(name||"?").slice(0,2).toUpperCase()}</div>;
}

function Pill({ label, s, small=false }) {
  return <span style={{fontSize:small?10:11,padding:small?"1px 6px":"2px 7px",borderRadius:6,background:s.bg,color:s.text,border:`0.5px solid ${s.border}`,whiteSpace:"nowrap"}}>{label}</span>;
}

function StrengthIcon({ type }) {
  const icons = { infantry:"⚔", cavalry:"🐴", archer:"🏹", mixed:"⚖", camel:"🐪", siege:"💣", monk:"📿", gunpowder:"💥", eco:"🌾", defensive:"🛡", elephant:"🐘" };
  return <span style={{fontSize:12}}>{icons[type]||"⚔"}</span>;
}

// Counter relationship badge between two teams
function CounterBadge({ t1Dominant, t2Dominant }) {
  const counterMsg = {
    cavalry: { archer: "Team 2's archers counter Team 1's cavalry", infantry: "Team 2's infantry counter Team 1's cavalry" },
    archer:  { cavalry: "Team 1's cavalry counter Team 2's archers", infantry: "Team 1's archers threaten Team 2's infantry" },
    infantry:{ archer: "Team 2's archers threaten Team 1's infantry", cavalry: "Team 1's infantry counter Team 2's cavalry" },
  };
  const msg = counterMsg[t1Dominant]?.[t2Dominant] || counterMsg[t2Dominant]?.[t1Dominant];
  if (!msg) return null;
  return (
    <div style={{fontSize:12,color:"var(--color-text-secondary)",padding:"6px 12px",background:"var(--color-background-secondary)",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",textAlign:"center",marginBottom:12}}>
      {msg}
    </div>
  );
}

function PlayerCard({ p, showCiv, compact }) {
  if (!p) return <div style={{height:compact?52:72,border:"0.5px dashed var(--color-border-tertiary)",borderRadius:10,background:"var(--color-background-secondary)"}}/>;
  const isFlank = p.position?.startsWith("Flank");
  const isPocket = p.position?.startsWith("Pocket");
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:compact?"8px 12px":"10px 14px"}}>
      <Avatar name={p.name} size={compact?32:36}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{p.name}</span>
          {p.rating && <span style={{fontSize:12,fontWeight:500,color:rc(p.rating)}}>{p.rating}</span>}
          {p.rating && <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{rl(p.rating)}</span>}
        </div>
        {showCiv && p.civ && (
          <div style={{marginTop:4}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              {p.position && <Pill label={p.position} s={POS_S[p.position]}/>}
              <Pill label={p.civ.name} s={TYPE_S[p.civ.type]}/>
            </div>
            <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
              {p.civ.strengths.slice(0,3).map(s=>(
                <span key={s} style={{fontSize:11,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:2}}>
                  <StrengthIcon type={s}/> {s}
                </span>
              ))}
              {p.civ.counters[0] && p.civ.counters[0]!=="all" && (
                <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>
                  counters {p.civ.counters[0]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamPane({ title, players, teamColor }) {
  const valid = players.filter(Boolean);
  const avg = valid.length ? Math.round(valid.reduce((s,p)=>s+(p.rating||1000),0)/valid.length) : 0;
  const teamType = valid.map(p=>p.civ?.type).filter(Boolean);
  const dominant = teamType.length ? Object.entries(teamType.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0][0] : null;

  return (
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{title}</span>
          {dominant && <Pill label={dominant} s={TYPE_S[dominant]||TYPE_S.mixed} small/>}
        </div>
        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>avg <strong style={{color:rc(avg),fontWeight:500}}>{avg}</strong></span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {players.map((p,i)=><PlayerCard key={i} p={p} showCiv/>)}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AoE2Balancer() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchErr, setSearchErr] = useState("");
  const [players, setPlayers] = useState([]);
  const [manualElo, setManualElo] = useState("");
  const [result, setResult] = useState(null);
  const [step, setStep] = useState("select");
  const [err, setErr] = useState("");
  const [balanceMode, setBalanceMode] = useState("strategic"); // "strategic" | "random"

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setSearching(true); setResults([]); setSearchErr(""); setErr("");
    try {
      const found = await searchWorldsEdge(q.trim());
      if (found.length) setResults(found);
      else setSearchErr(`No RM 1v1 results for "${q}". Add manually or check spelling.`);
    } catch {
      setSearchErr(`Couldn't reach World's Edge API — add "${q}" manually with their ELO.`);
    } finally { setSearching(false); }
  }, []);

  const addFromResult = (p) => {
    if (players.length>=8) { setErr("Max 8 players."); return; }
    if (players.find(x=>x.name.toLowerCase()===p.name.toLowerCase())) { setErr("Already added."); return; }
    setPlayers(prev=>[...prev,{name:p.name,rating:p.rating,rank:p.rank,wins:p.wins,losses:p.losses}]);
    setQuery(""); setResults([]); setSearchErr(""); setErr("");
  };

  const addManually = () => {
    if (!query.trim()) return;
    if (players.length>=8) { setErr("Max 8 players."); return; }
    if (players.find(x=>x.name.toLowerCase()===query.toLowerCase())) { setErr("Already added."); return; }
    setPlayers(prev=>[...prev,{name:query.trim(),rating:parseInt(manualElo)||null}]);
    setQuery(""); setManualElo(""); setResults([]); setSearchErr(""); setErr("");
  };

  const removePlayer = (i) => { setPlayers(p=>p.filter((_,idx)=>idx!==i)); setResult(null); };
  const updateRating = (i,v) => { setPlayers(p=>p.map((x,idx)=>idx===i?{...x,rating:v}:x)); setResult(null); };

  const balance = () => {
    const {team1,team2} = balanceTeams(players);
    if (balanceMode==="strategic") {
      setResult(buildResult(team1,team2));
    } else {
      // Random: just shuffle civs
      const pool = [...CIVS].sort(()=>Math.random()-0.5);
      const poss = ["Flank 1","Flank 2","Pocket 1","Pocket 2"];
      const assign = (team) => team.map((p,i) => p ? {...p, position:poss[i], civ:pool.splice(0,1)[0]} : null);
      setResult({team1:assign(team1),team2:assign(team2)});
    }
    setStep("result"); setErr("");
  };

  const reroll = () => {
    if (!result) return;
    const raw1 = result.team1.map(p=>p?{name:p.name,rating:p.rating,rank:p.rank,wins:p.wins,losses:p.losses}:null);
    const raw2 = result.team2.map(p=>p?{name:p.name,rating:p.rating,rank:p.rank,wins:p.wins,losses:p.losses}:null);
    if (balanceMode==="strategic") {
      setResult(buildResult(raw1,raw2));
    } else {
      const pool = [...CIVS].sort(()=>Math.random()-0.5);
      const poss = ["Flank 1","Flank 2","Pocket 1","Pocket 2"];
      const assign = (team) => team.map((p,i) => p ? {...p,position:poss[i],civ:pool.splice(0,1)[0]} : null);
      setResult({team1:assign(raw1),team2:assign(raw2)});
    }
  };

  const rebalance = () => {
    const {team1,team2} = balanceTeams(players);
    if (balanceMode==="strategic") setResult(buildResult(team1,team2));
    else {
      const pool=[...CIVS].sort(()=>Math.random()-0.5);
      const poss=["Flank 1","Flank 2","Pocket 1","Pocket 2"];
      const assign=(t)=>t.map((p,i)=>p?{...p,position:poss[i],civ:pool.splice(0,1)[0]}:null);
      setResult({team1:assign(team1),team2:assign(team2)});
    }
  };

  const t1avg = result ? Math.round(result.team1.filter(Boolean).reduce((s,p)=>s+(p.rating||1000),0)/Math.max(1,result.team1.filter(Boolean).length)) : 0;
  const t2avg = result ? Math.round(result.team2.filter(Boolean).reduce((s,p)=>s+(p.rating||1000),0)/Math.max(1,result.team2.filter(Boolean).length)) : 0;
  const diff = Math.abs(t1avg-t2avg);
  const bq = diff<=30?{l:"Perfect",c:"#1D9E75"}:diff<=80?{l:"Great",c:"#1D9E75"}:diff<=150?{l:"Good",c:"#BA7517"}:{l:"Uneven",c:"#D85A30"};

  const t1dominant = result ? (() => { const types=result.team1.filter(Boolean).map(p=>p.civ?.type).filter(Boolean); return types.length?Object.entries(types.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0][0]:null; })() : null;
  const t2dominant = result ? (() => { const types=result.team2.filter(Boolean).map(p=>p.civ?.type).filter(Boolean); return types.length?Object.entries(types.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0][0]:null; })() : null;

  const btn = (active) => ({ padding:"6px 13px",borderRadius:7,fontSize:12,cursor:"pointer",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:active?"var(--color-text-primary)":"var(--color-text-secondary)" });

  return (
    <div style={{padding:"1.5rem 0",maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 4px"}}>AoE2 Team Balancer</h2>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>
          Live ratings from World's Edge · Balance by ELO + civ strategy · Flanks get archer/infantry civs, pockets get cavalry/eco civs
        </p>
      </div>

      {step==="select" && (
        <>
          {/* Search box */}
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={query}
                onChange={e=>{setQuery(e.target.value);setResults([]);setSearchErr("");}}
                onKeyDown={e=>{if(e.key==="Enter")doSearch(query);}}
                placeholder="Player name (e.g. TheViper, Hera…)"
                style={{flex:1,fontSize:14,padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)"}}
              />
              <button onClick={()=>doSearch(query)} disabled={searching||!query.trim()}
                style={{padding:"8px 16px",borderRadius:8,fontSize:14,cursor:"pointer",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",opacity:(searching||!query.trim())?0.5:1}}>
                {searching?"…":"Search"}
              </button>
            </div>

            {results.length>0 && (
              <div style={{marginBottom:8}}>
                <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 6px"}}>World's Edge results — click to add:</p>
                {results.slice(0,5).map((p,i)=>(
                  <div key={i} onClick={()=>addFromResult(p)}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Avatar name={p.name} size={28}/>
                      <span style={{fontSize:14,fontWeight:500}}>{p.name}</span>
                      {p.rank&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>#{p.rank}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {p.wins!=null&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{p.wins}W–{p.losses}L</span>}
                      <span style={{fontSize:14,fontWeight:500,color:rc(p.rating)}}>{p.rating}</span>
                      <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>RM 1v1</span>
                      <span style={{fontSize:12,padding:"2px 8px",borderRadius:6,background:"var(--color-background-info)",color:"var(--color-text-info)",border:"0.5px solid var(--color-border-info)"}}>+ Add</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchErr&&<p style={{fontSize:12,color:"var(--color-text-warning)",margin:"0 0 8px",padding:"6px 10px",background:"var(--color-background-warning)",borderRadius:8}}>{searchErr}</p>}

            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:"var(--color-text-tertiary)",flexShrink:0}}>Add manually:</span>
              <input type="number" value={manualElo} onChange={e=>setManualElo(e.target.value)} placeholder="ELO (optional)"
                style={{width:120,fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)"}}/>
              <button onClick={addManually} disabled={!query.trim()||players.length>=8}
                style={{padding:"6px 14px",borderRadius:8,fontSize:13,cursor:"pointer",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",opacity:(!query.trim()||players.length>=8)?0.5:1}}>
                Add
              </button>
            </div>
          </div>

          {err&&<p style={{fontSize:13,color:"var(--color-text-danger)",margin:"0 0 10px",padding:"7px 12px",background:"var(--color-background-danger)",borderRadius:8}}>{err}</p>}

          {/* Player list */}
          {players.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{players.length} / 8 players</span>
                <div style={{flex:1,height:4,background:"var(--color-background-secondary)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${(players.length/8)*100}%`,height:"100%",borderRadius:2,background:players.length===8?"#1D9E75":"#378ADD",transition:"width 0.3s"}}/>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {players.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"9px 12px"}}>
                    <Avatar name={p.name}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{p.name}</span>
                        {p.rating?<><span style={{fontSize:13,fontWeight:500,color:rc(p.rating)}}>{p.rating}</span><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{rl(p.rating)}</span></>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>no rating</span>}
                        {p.wins!=null&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.wins}W–{p.losses}L</span>}
                      </div>
                    </div>
                    <input type="number" value={p.rating??""} placeholder="ELO"
                      onChange={e=>updateRating(i,parseInt(e.target.value)||null)}
                      style={{width:72,fontSize:13,textAlign:"right",padding:"4px 8px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)"}}/>
                    <button onClick={()=>removePlayer(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:18,lineHeight:1,padding:"2px 4px",flexShrink:0}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance mode toggle */}
          <div style={{display:"flex",gap:8,marginBottom:10,padding:"10px 14px",background:"var(--color-background-secondary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",alignItems:"center"}}>
            <span style={{fontSize:13,color:"var(--color-text-secondary)",flexShrink:0}}>Civ assignment:</span>
            <button onClick={()=>setBalanceMode("strategic")}
              style={{padding:"5px 14px",borderRadius:7,fontSize:13,cursor:"pointer",border:`0.5px solid ${balanceMode==="strategic"?"var(--color-border-primary)":"var(--color-border-secondary)"}`,background:balanceMode==="strategic"?"var(--color-background-primary)":"transparent",color:balanceMode==="strategic"?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:balanceMode==="strategic"?500:400}}>
              Strategic
            </button>
            <button onClick={()=>setBalanceMode("random")}
              style={{padding:"5px 14px",borderRadius:7,fontSize:13,cursor:"pointer",border:`0.5px solid ${balanceMode==="random"?"var(--color-border-primary)":"var(--color-border-secondary)"}`,background:balanceMode==="random"?"var(--color-background-primary)":"transparent",color:balanceMode==="random"?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:balanceMode==="random"?500:400}}>
              Random
            </button>
            {balanceMode==="strategic"&&(
              <span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:4}}>
                Flanks get archer/infantry · Pockets get cavalry/eco · Civs counter-pick across teams
              </span>
            )}
          </div>

          <button onClick={balance} disabled={players.length<2}
            style={{width:"100%",padding:13,borderRadius:10,fontSize:15,fontWeight:500,cursor:players.length>=2?"pointer":"not-allowed",border:"0.5px solid var(--color-border-primary)",background:players.length>=2?"var(--color-background-primary)":"var(--color-background-secondary)",color:players.length>=2?"var(--color-text-primary)":"var(--color-text-tertiary)"}}>
            Balance teams & assign civs →
          </button>
          {players.length<2&&<p style={{textAlign:"center",fontSize:12,color:"var(--color-text-tertiary)",margin:"8px 0 0"}}>Add at least 2 players</p>}
        </>
      )}

      {step==="result" && result && (
        <>
          {/* Status bar */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 14px",marginBottom:12,border:"0.5px solid var(--color-border-tertiary)"}}>
            <div>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Balance: </span>
              <span style={{fontSize:13,color:bq.c}}>{bq.l}</span>
              <span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:6}}>({diff} ELO diff)</span>
              {balanceMode==="strategic"&&<span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:8}}>· strategic civs</span>}
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={rebalance} style={btn(true)}>Rebalance</button>
              <button onClick={reroll} style={btn(true)}>Reroll civs</button>
              <button onClick={()=>setStep("select")} style={btn(false)}>Edit players</button>
            </div>
          </div>

          {/* Counter relationship note */}
          {balanceMode==="strategic" && t1dominant && t2dominant && (
            <CounterBadge t1Dominant={t1dominant} t2Dominant={t2dominant}/>
          )}

          {/* Teams */}
          <div style={{display:"flex",gap:14}}>
            <TeamPane title="Team 1" players={result.team1}/>
            <div style={{width:1,background:"var(--color-border-tertiary)",flexShrink:0,margin:"28px 0 0"}}/>
            <TeamPane title="Team 2" players={result.team2}/>
          </div>

          {/* Legend */}
          <div style={{marginTop:14,padding:"10px 14px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,background:"var(--color-background-secondary)"}}>
            <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"0 0 6px",fontWeight:500}}>Legend</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {Object.entries(TYPE_S).map(([t,s])=><Pill key={t} label={t} s={s}/>)}
              {Object.entries(POS_S).map(([p,s])=><Pill key={p} label={p} s={s}/>)}
            </div>
            {balanceMode==="strategic"&&(
              <p style={{fontSize:11,color:"var(--color-text-tertiary)",margin:"8px 0 0"}}>
                Strategic mode: top 2 rated players → Pocket (cavalry/eco civs) · bottom 2 → Flank (archer/infantry civs) · civs chosen to counter-pick the opposing team
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
