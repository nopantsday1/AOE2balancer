# AoE2 Team Balancer

A web app to balance Age of Empires II Definitive Edition team games. Add up to 8 players, fetch their live RM 1v1 ELO from the World's Edge API, split them into two balanced teams, and auto-assign civilizations and positions using a strategic counter-pick system.

![AoE2 Team Balancer screenshot](./screenshot.png)

---

## Features

- **Live ratings** — fetches current RM 1v1 ELO directly from the World's Edge (Relic Link) API
- **Smart balancing** — snake-draft algorithm minimizes average ELO difference between teams
- **Strategic civ assignment** — two modes:
  - **Strategic**: flanks get archer/infantry civs, pockets get cavalry/eco civs, with cross-team counter-picking
  - **Random**: fully random civ assignment
- **Position assignment by skill** — the two highest-rated players on each team are automatically placed as Pockets
- **Manual fallback** — add players manually with a custom ELO if the API search doesn't find them
- **Reroll & rebalance** — reroll civs or reshuffle teams without re-entering players

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/aoe2-balancer.git
cd aoe2-balancer
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

The output will be in the `dist/` folder.

---

## Project Structure

```
aoe2-balancer/
├── src/
│   ├── App.jsx          # Main balancer component
│   └── main.jsx         # React entry point
├── public/
├── index.html
├── vite.config.js
└── package.json
```

---

## How It Works

### Player search

Players are searched by name against the World's Edge leaderboard API:

```
GET https://aoe-api.worldsedgelink.com/community/leaderboard/GetLeaderBoard
  ?title=age2
  &leaderboard_id=3        # 3 = RM 1v1
  &profile_names[]=PlayerName
  &count=5
```

The app tries the endpoint directly first. If the browser blocks it due to CORS, it falls back to [corsproxy.io](https://corsproxy.io). For production deployments, consider replacing this with your own proxy (see [Deployment](#deployment)).

### Team balancing

Players are sorted by ELO descending and distributed using a **snake draft**:

```
Pick order: T1, T2, T2, T1, T1, T2, T2, T1
```

This minimizes the average ELO gap between the two teams.

### Strategic civ assignment

Each civ in the database has a `flankScore` (0–3) and `pocketScore` (0–3), plus metadata about strengths, counters, and weaknesses.

1. The 2 highest-rated players on each team become **Pockets**, the other 2 become **Flanks**
2. Flank civs are filtered to exclude pure cavalry civs (cavalry flanking is weak in team games)
3. Pocket civs are filtered to exclude pure archer civs (archers struggle in the pocket position)
4. Civs are scored with a bonus if they **counter the opposing team's dominant unit type**
5. Teams are assigned in two passes so both sides benefit from counter-picking

---

## Deployment

### GitHub Pages

1. Update `vite.config.js` to set the base path:

```js
// vite.config.js
export default {
  base: '/aoe2-balancer/',
}
```

2. Install the deploy plugin:

```bash
npm install --save-dev gh-pages
```

3. Add deploy scripts to `package.json`:

```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

4. Deploy:

```bash
npm run deploy
```

### Vercel / Netlify

Connect your GitHub repo — both platforms will auto-detect Vite and deploy on every push with zero configuration.

### Self-hosted CORS proxy (recommended for production)

The default fallback uses `corsproxy.io`, which may be rate-limited for public traffic. A simple Cloudflare Worker proxy takes about 5 minutes to set up:

```js
// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("Missing url param", { status: 400 });
    const res = await fetch(target);
    const body = await res.text();
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
```

Then update `CORS_PROXY` in `App.jsx` to point to your worker URL.

---

## API Notice

The World's Edge / Relic Link API (`aoe-api.worldsedgelink.com`) is an **unofficial, undocumented endpoint**. It is the same API used by the official Age of Empires website's leaderboard pages. World's Edge / Relic may change, rate-limit, or remove it without notice. This project is not affiliated with or endorsed by World's Edge, Relic Entertainment, or Microsoft.

---

## Contributing

Pull requests are welcome. If you want to improve the civ database (scores, counters, strengths), edit the `CIVS` array in `src/App.jsx`. Each entry looks like:

```js
{
  name: "Franks",
  flank: 1,           // 0–3, how suitable as a flank player
  pocket: 3,          // 0–3, how suitable as a pocket player
  strengths: ["cavalry", "eco"],
  counters: ["infantry"],
  counteredBy: ["camel"],
  type: "cavalry",    // infantry | cavalry | archer | mixed
}
```

---

## License

MIT — do whatever you want with it.
