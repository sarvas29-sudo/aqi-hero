# 🌫️ AQI Hero — Delhi Air Quality Education Game

An interactive browser-based game that teaches children (ages 9–12) about Delhi's air pollution crisis. Players manage the city's Air Quality Index (AQI) across seasons by deploying real, research-backed interventions at pollution hotspots across the city.

Built as part of a climate education initiative focused on urban children in India.

---

## 🎮 How It Works

Players take on the role of Delhi's Air Quality Manager. Each round represents a season — Spring, Summer, Monsoon, Harvest, and Diwali — each with real seasonal AQI data and pollution events based on CPCB and IQAir records.

The city map shows **7 pollution hotspots**:

| Hotspot | Key Sources |
|---|---|
| 🏯 Red Fort | 2-wheelers, 3-wheelers, Chandni Chowk traffic |
| 🏛️ India Gate | Commuter corridors, bus routes |
| 🌊 Yamuna | Open waste burning, industrial runoff |
| 🌾 NCR Farms | Paddy stubble burning (Punjab/Haryana) |
| 🏗️ Construction Sites | Road dust, unpaved surfaces |
| 🕌 South Delhi | Residential burning, cooking fuel |
| 🏭 East Delhi Industry | Brick kilns, diesel generators, factories |

Each round players receive **7 Action Points (AP)** to spend on interventions. At the end of the year, they receive an AQI grade from **A+ (Good)** to **D (Hazardous)** based on how much they reduced pollution.

---

## 🔬 Research-Backed Actions

Every action in the game is grounded in peer-reviewed research and real Delhi policy data. Actions are tagged by evidence strength:

- ✅ **Strong evidence** — supported by multiple studies
- ⚠️ **Mixed evidence** — some data, contested results
- ❓ **Weak evidence** — limited or disputed impact

Examples:

| Action | Evidence | Real-World Basis |
|---|---|---|
| Bio-Decomposer Spray | ✅ Strong | IARI Pusa bio-decomposer; stubble burning = 30–35% of Delhi PM2.5 in Oct–Nov (PMC 2023) |
| Road Dust Enforcement | ✅ Strong | WRF-CMAQ modelling: zeroing construction dust = 28% local PM2.5 reduction (AAQR 2022) |
| Electric Bus Fleet | ⚠️ Mixed | 74% reduction in bus emissions, but buses are a small share of total PM2.5 (Kyushu Univ. 2022) |
| Odd-Even Scheme | ❓ Weak | Only 4–6% PM2.5 reduction in most studies; zero effect found in April 2016 trial (Mohan et al. 2017) |
| Smog Tower | ❓ Weak | Negligible city-wide impact; effective only within ~200m radius (IIT Bombay 2022) |

Sources include: IIT Kanpur/TERI source apportionment (2018), CPCB monitoring data, Science Advances (2024), ICCT TRUE Initiative (2024), PMC stubble burning studies (2023), CSE Mobility Report (2024).

---

## 📊 Real Delhi AQI Data

Seasonal AQI values are drawn from CPCB and IQAir historical records:

| Month | Avg AQI | Season |
|---|---|---|
| Jan | 312 | ❄️ Winter |
| Mar–Apr | 172 | 🌸 Spring |
| Jul–Aug | 85 | 🌧️ Monsoon |
| Oct–Nov | 294–368 | 🌾 Harvest / 🪔 Diwali |
| Dec | 290 | ❄️ Winter |

---

## 🛠️ Tech Stack

- **React** (single component, no external UI libraries)
- **Web Audio API** — procedural background music and sound effects
- **SVG** — fully illustrated cartoon Delhi map with seasonal animations
- **Vite** — build tool

---

## 🚀 Running Locally

```bash
git clone https://github.com/yourname/aqi-hero
cd aqi-hero
npm install
npm run dev
```

---

## 🗺️ Roadmap

- [ ] Ages 6–9 simplified version (single-scene, visual sky feedback)
- [ ] Mumbai and Bengaluru city maps
- [ ] Teacher dashboard with student strategy comparison
- [ ] Hindi language support
- [ ] Classroom multiplayer mode

---

## 📚 Key Sources

- TERI/ARAI Source Apportionment of PM2.5 & PM10, Delhi NCR (2018)
- IIT Kanpur Comprehensive Study on Air Pollution Sources (2016)
- Ghude et al., Decision Support System for Delhi Air Quality (GMD, 2024)
- Mohan et al., Evaluation of Odd-Even Traffic Restriction (2017)
- Kyushu University, Electric Bus Co-benefits Study (2022)
- CSE, Mobility Crisis Behind Delhi Pollution (2024)
- Science Advances, PM2.5 Inequalities in India (2024)
- ICCT TRUE Initiative, Real-World Vehicle Emissions Delhi (2024)

---

*Built with Claude · Climate education for urban India*
