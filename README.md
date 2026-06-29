# 🇮🇳 India Option Pricing Engine v2.0

A full-stack option pricing platform built specifically for **NSE and BSE Indian markets** — pricing options in **INR (₹)** with Indian market conventions, RBI rates, NSE lot sizes, and CE/PE notation.

---

## What's Inside

| Feature | Details |
|---|---|
| **Pricing Models** | Black-Scholes-Merton (analytical) · Monte Carlo (antithetic variates) · Binomial Tree CRR |
| **Option Styles** | European (NSE Index: Nifty, BankNifty) · American (NSE Stocks) · Asian (arithmetic & geometric) |
| **Greeks** | Delta, Gamma, Theta, Vega, Rho + Vanna, Volga, Charm, Speed, Color — all in ₹ per lot |
| **Implied Vol** | Newton-Raphson IV solver + model vol smile/surface |
| **Market Data** | 16 NSE/BSE underlyings · lot sizes · RBI rates · expiry cycles · SEBI margin notes |
| **Currency** | All outputs in **INR (₹)** with per-unit and per-lot breakdowns |
| **Frontend** | React + Recharts — payoff chart, model comparison table, vol surface chart |
| **Backend** | FastAPI + NumPy/SciPy — REST API with OpenAPI docs |
| **Tests** | 16 unit tests covering BSM, Monte Carlo, Binomial, Greeks, Asian |

---

## Project Structure

```
india-option-pricer/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + CORS
│   │   ├── api/
│   │   │   ├── pricing.py             # /api/pricing — European, American, Asian
│   │   │   ├── greeks.py              # /api/greeks — full 1st & 2nd order Greeks
│   │   │   ├── implied_vol.py         # /api/vol — IV solver + vol surface
│   │   │   └── market_data.py         # /api/market-data — underlyings, RBI rates
│   │   ├── core/
│   │   │   └── pricing_engine.py      # BSM, Monte Carlo, Binomial CRR, Greeks
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic request/response models
│   │   └── services/
│   │       ├── market_data_service.py # NSE/BSE contract specs, RBI rates
│   │       └── implied_vol.py         # Newton-Raphson IV + vol surface
│   ├── tests/
│   │   └── test_pricing.py            # 16 unit tests
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Root — tab navigation
│   │   ├── main.jsx                   # React entry point
│   │   ├── components/
│   │   │   ├── Header.jsx             # NSE-blue header
│   │   │   ├── OptionForm.jsx         # Full input form with presets
│   │   │   ├── PricingResult.jsx      # Results + payoff chart
│   │   │   └── ui.jsx                 # Shared UI primitives
│   │   ├── pages/
│   │   │   ├── PricerPage.jsx         # Option Pricer tab
│   │   │   ├── GreeksPage.jsx         # Greeks tab
│   │   │   ├── ImpliedVolPage.jsx     # IV solver + vol surface
│   │   │   └── MarketDataPage.jsx     # Market data tab
│   │   └── utils/
│   │       ├── api.js                 # All API calls
│   │       └── format.js              # ₹ formatting utilities
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pip | latest | comes with Python |
| npm | 9+ | comes with Node.js |

Check what you have:
```bash
python --version     # need 3.10+
node --version       # need 18+
pip --version
npm --version
```

---

## Setup — Step by Step

### 1. Clone / Extract the project

```bash
# If from zip:
unzip india-option-pricer.zip
cd india-option-pricer

# If from git:
git clone <repo-url>
cd india-option-pricer
```

---

### 2. Backend Setup

```bash
cd backend
```

**Create and activate a virtual environment (recommended):**

```bash
# macOS / Linux
python -m venv venv
source venv/bin/activate

# Windows (Command Prompt)
python -m venv venv
venv\Scripts\activate.bat

# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1
```

You should see `(venv)` in your terminal prompt.

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

This installs: `fastapi`, `uvicorn`, `pydantic`, `numpy`, `scipy`, `httpx`, `python-dotenv`.

**Copy the environment file:**

```bash
cp .env.example .env
```

**Start the backend server:**

```bash
python run.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

**Verify it works:**
```bash
curl http://localhost:8000/health
# → {"status":"ok"}

curl http://localhost:8000/
# → {"service":"India Option Pricing Engine","version":"2.0.0",...}
```

**Interactive API docs** (Swagger UI):
```
http://localhost:8000/api/docs
```

---

### 3. Frontend Setup

Open a **new terminal** (keep the backend running):

```bash
cd frontend      # from the project root
npm install
```

This installs: `react`, `react-dom`, `recharts`, `lucide-react`, `vite`.

**Start the frontend dev server:**

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 400ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open your browser:** [http://localhost:5173](http://localhost:5173)

---

### 4. Run Tests

```bash
cd backend
source venv/bin/activate    # if not already active

pip install pytest
python -m pytest tests/ -v
```

Expected output:
```
============================= test session starts ==============================
collected 16 items

tests/test_pricing.py::TestBSM::test_atm_call_put_parity           PASSED
tests/test_pricing.py::TestBSM::test_deep_itm_call_approaches_intrinsic PASSED
tests/test_pricing.py::TestBSM::test_nifty_atm_example             PASSED
tests/test_pricing.py::TestBSM::test_zero_vol_boundary             PASSED
tests/test_pricing.py::TestMonteCarlo::test_convergence_to_bsm     PASSED
tests/test_pricing.py::TestMonteCarlo::test_std_error_decreases_with_sims PASSED
tests/test_pricing.py::TestBinomial::test_european_matches_bsm     PASSED
tests/test_pricing.py::TestBinomial::test_american_put_ge_european  PASSED
tests/test_pricing.py::TestGreeks::test_call_delta_range            PASSED
tests/test_pricing.py::TestGreeks::test_put_delta_range             PASSED
tests/test_pricing.py::TestGreeks::test_delta_put_call_relationship PASSED
tests/test_pricing.py::TestGreeks::test_gamma_positive              PASSED
tests/test_pricing.py::TestGreeks::test_vega_positive               PASSED
tests/test_pricing.py::TestGreeks::test_theta_negative_for_long     PASSED
tests/test_pricing.py::TestAsian::test_asian_call_less_than_european PASSED
tests/test_pricing.py::TestAsian::test_geometric_less_than_arithmetic PASSED

============================== 16 passed in 3.0s ==============================
```

---

## API Reference

Base URL: `http://localhost:8000`

### Pricing

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/pricing/european` | BSM + Monte Carlo + Binomial (NSE Index options) |
| `POST` | `/api/pricing/american` | Binomial CRR with early exercise (NSE Stock options) |
| `POST` | `/api/pricing/asian` | Monte Carlo Asian — arithmetic or geometric |

**Example — Price Nifty ATM CE (European):**

```bash
curl -X POST http://localhost:8000/api/pricing/european \
  -H "Content-Type: application/json" \
  -d '{
    "underlying": "NIFTY",
    "spot_price": 19500,
    "strike_price": 19500,
    "time_to_expiry": 0.0822,
    "volatility": 0.14,
    "risk_free_rate": 0.065,
    "dividend_yield": 0.0,
    "option_type": "CE",
    "exercise_style": "european",
    "lot_size": 50,
    "num_simulations": 50000
  }'
```

**Response includes:**
```json
{
  "bsm":          { "call_price": 368.93, "call_price_inr": 18446.50, ... },
  "monte_carlo":  { "call_price": 367.12, "call_std_error": 1.58, ... },
  "binomial":     { "call_price": 368.53, "num_steps": 200, ... }
}
```

### Greeks

```bash
curl -X POST http://localhost:8000/api/greeks/ \
  -H "Content-Type: application/json" \
  -d '{
    "spot_price": 19500, "strike_price": 19500,
    "time_to_expiry": 0.0822, "volatility": 0.14,
    "risk_free_rate": 0.065, "dividend_yield": 0.0,
    "lot_size": 50, "option_type": "CE",
    "exercise_style": "european", "num_simulations": 1000
  }'
```

### Implied Volatility

```bash
curl -X POST http://localhost:8000/api/vol/implied-vol \
  -H "Content-Type: application/json" \
  -d '{
    "market_price": 368,
    "spot_price": 19500, "strike_price": 19500,
    "time_to_expiry": 0.0822,
    "risk_free_rate": 0.065, "dividend_yield": 0.0,
    "option_type": "CE"
  }'
```

### Market Data

```bash
# All underlyings
curl http://localhost:8000/api/market-data/underlyings

# Specific symbol
curl http://localhost:8000/api/market-data/underlyings/BANKNIFTY

# RBI rates
curl http://localhost:8000/api/market-data/rbi-rates

# NSE market structure
curl http://localhost:8000/api/market-data/nse-info
```

---

## Indian Market Details

### Supported Underlyings

| Symbol | Exchange | Lot Size | Style |
|---|---|---|---|
| NIFTY | NSE | 50 | European |
| BANKNIFTY | NSE | 15 | European |
| FINNIFTY | NSE | 40 | European |
| MIDCPNIFTY | NSE | 75 | European |
| SENSEX | BSE | 10 | European |
| RELIANCE | NSE | 250 | American |
| TCS | NSE | 150 | American |
| HDFCBANK | NSE | 550 | American |
| INFY | NSE | 400 | American |
| ICICIBANK | NSE | 700 | American |
| SBIN | NSE | 1500 | American |
| BAJFINANCE | NSE | 125 | American |
| TATAMOTORS | NSE | 1425 | American |
| WIPRO | NSE | 1500 | American |
| HINDUNILVR | NSE | 300 | American |
| ADANIENT | NSE | 300 | American |

> ⚠ NSE revises lot sizes periodically. Always verify at [nseindia.com](https://www.nseindia.com) before trading.

### Risk-Free Rate

Use the **RBI Repo Rate** as the risk-free rate:
- Current rate: **6.50%** → enter `0.065`
- Verify at [rbi.org.in](https://rbi.org.in)

### CE / PE Notation

NSE uses **CE** (Call European/Call) and **PE** (Put European/Put) — not "C" and "P" as in Western markets.

### Expiry Cycles

- **Nifty**: Monthly (last Thursday) + Weekly (every Thursday)
- **Bank Nifty**: Monthly (last Thursday) + Weekly (every Wednesday)
- **Stock options**: Monthly only (last Thursday), **American style** since October 2019

---

## Troubleshooting

**Backend won't start — `ModuleNotFoundError`**
```bash
# Make sure venv is active and packages installed
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend shows "Failed to fetch" / API errors**
```bash
# Make sure backend is running on port 8000
curl http://localhost:8000/health
# Vite proxies /api → localhost:8000 automatically
```

**`python` command not found on Windows**
```bash
# Try python3 or py instead
py -m venv venv
py run.py
```

**Port 8000 or 5173 already in use**
```bash
# Change backend port in run.py:
uvicorn.run("app.main:app", host="0.0.0.0", port=8001, ...)

# Change frontend port in vite.config.js:
server: { port: 5174, proxy: { '/api': 'http://localhost:8001' } }
```

**`venv\Scripts\Activate.ps1` blocked on Windows PowerShell**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try again
venv\Scripts\Activate.ps1
```

---

## Production Deployment

**Backend (uvicorn + gunicorn):**
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Frontend (build static files):**
```bash
cd frontend
npm run build          # outputs to frontend/dist/
# Serve dist/ with nginx or any static host
```

**Update CORS in `backend/app/main.py`:**
```python
allow_origins=["https://your-domain.com"]
```

---

## Disclaimer

This tool is for **educational and research purposes only**. It is not financial advice and does not constitute a recommendation to buy or sell any security or derivative instrument.

- Option pricing models assume certain market conditions that may not hold in reality.
- Lot sizes, expiry dates, and contract specifications change — always verify on NSE/BSE before trading.
- The risk-free rate used (RBI Repo) is a reference and may differ from actual funding costs.
- Past model accuracy does not guarantee future accuracy.

Consult a SEBI-registered investment advisor before making investment decisions.

---

## License

MIT License — free to use, modify, and distribute with attribution.
