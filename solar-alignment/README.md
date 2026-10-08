# SolMax — Solar Panel Alignment Instrument

A self-contained **single-page web app + website** that calculates the optimal **tilt**, **direction**, and **row spacing** for solar panels based on your exact location, using real solar-position astronomy. **No paid APIs, no build step, no server-side code.** Zip it and upload it — it just works.

**SolMax** packages the calculator into a full website with **Home**, **Tool**, **About**, and **Contact** pages — all in one fast, mobile-friendly PWA.

---

## What it does

You enter your location (GPS, city shortcut, or coordinates) and your roof details. SolMax computes, from first-principles astronomy:

- The **tilt angle** that captures the most sunlight for your chosen priority (year-round, winter, or summer)
- The **compass direction** the panels should face (set with an interactive compass dial)
- The minimum **row spacing** so rows don't shade each other
- A month-by-month breakdown of effective sun-hours and productive daylight windows

**New: weather-adjusted estimates, financial ROI, and self-learning feedback.**

---

## Pages

| Page | Description |
|------|-------------|
| **Home** | Landing with features overview, how-it-works steps, and call-to-action |
| **Tool** | The full solar alignment calculator — location, roof input, weather, financials, results |
| **About** | Explains the science behind the calculation: declination, altitude, incidence angle, optimization algorithm |
| **Contact** | Contact info, GitHub link, and message form |

---

## What's included

### Solar geometry engine (`js/solar-engine.js`)
Standard solar-position equations from Duffie & Beckman:
- **Declination** — the sun's latitude in the sky (±23.45°)
- **Hour angle & day length** — sunrise/sunset times
- **Solar altitude** — sun height above horizon (10° usable threshold)
- **Angle of incidence** — core metric that SolMax maximizes
- **Two-stage brute-force optimization** — coarse sweep (10° × 5°) then fine refinement (2° × 1°)

### Weather-adjusted estimates
- **Cloud cover** — adjustable slider or fetch real data from free Open-Meteo API (no key needed)
- **Temperature derating** — panels lose efficiency above 25°C; NOCT model
- **Soiling losses** — days since rain affects dust accumulation
- **Air mass & diffuse light** — models how atmosphere scatters sunlight
- **System losses** — inverter, wiring, mismatch (typical 15%)

### Financial / ROI calculator
- **Annual kWh production** — adjusted for weather, temperature, soiling, system losses
- **Annual savings** — based on your electricity rate
- **Payback period** — months or years to break even
- **25-year net profit & ROI** — projects lifetime value

### Client-side roof measurement
- **Canvas angle tool** — upload a photo of your roof, draw a line along the roof edge, get the pitch angle. No data leaves your device.
- **Device sensors** — place your phone on the roof to measure pitch (DeviceOrientation API) or point it in the facing direction to set the compass.

### Self-learning feedback
Submit actual production data and SolMax stores it locally. It shows:
- **Global accuracy average** — how close estimates tend to be
- **Regional accuracy** — entries near your latitude/longitude

All data stays in your browser's localStorage — nothing is sent to any server.

---

## How to deploy (static host)

This is a plain static website. **No build step. No paid APIs. No database.**

1. **Zip the entire folder.**
2. Upload to your web server's public directory.
3. Visit your domain. That's it.

**Any standard web host works** — shared hosting, cPanel, Netlify, Vercel, GitHub Pages, Cloudflare Pages, an S3 bucket, or a plain Apache/Nginx server. No database, no PHP, no Node runtime required.

### Folder structure
```
index.html
manifest.json
favicon.svg
.htaccess
css/styles.css
js/solar-engine.js
js/icons.js
js/charts.js
js/app.js
```

### HTTPS and geolocation
The "Use my current location" button uses the browser Geolocation API, which **only works over HTTPS** (or `localhost`). Most hosts provide free HTTPS (Let's Encrypt). Over plain HTTP, enter location manually.

---

## File overview

| File | Purpose |
|------|---------|
| `index.html` | SPA shell with all pages and tool modules |
| `css/styles.css` | All styling |
| `js/solar-engine.js` | Pure astronomy math + weather/financial models (also runnable under Node) |
| `js/icons.js` | Inline SVG icon set (no external icon font) |
| `js/charts.js` | Sun-elevation chart, monthly bar chart, interactive compass |
| `js/app.js` | SPA routing, UI wiring, calculator, photo tool, sensors, weather fetch, feedback |
| `manifest.json` | PWA manifest (lets phones "Add to Home Screen") |
| `favicon.svg` | App icon |
| `.htaccess` | Apache caching, gzip, SPA fallback |

Test the solar engine standalone (no browser needed):
```bash
node -e "const E=require('./js/solar-engine.js'); console.log(E.optimizeTiltAndAzimuth(51.5, [0,1,2,3,4,5,6,7,8,9,10,11]))"
```

---

## Dependencies

- **Open-Meteo API** (free, no key) — optional weather fetch
- **Google Fonts** (Fraunces, IBM Plex Sans/Mono) — optional, falls back to system fonts
- Everything else is self-contained inline code — zero network dependencies after first load

---

## Browser support

Works in any current version of Chrome, Firefox, Safari, and Edge, on desktop and mobile. Device orientation sensors require a compatible device with the necessary hardware (most modern phones).
