# EarnHub 🌐

> **Unified Multi-Account Dashboard & Node Fleet Manager for Bandwidth Sharing and Passive Income Applications.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-earnhub.2kvn.com-10b981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://earnhub.2kvn.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)

---

## 1. Project Introduction 🚀

**EarnHub** is an all-in-one web-based monitoring and management application designed for individuals and operators running passive income applications, DePIN nodes, and bandwidth-sharing networks (such as Proxyrack, EarnApp, Honeygain, GetGrass, Pawns.app, and PacketStream).

When deploying dozens or hundreds of nodes across residential connections, Virtual Private Servers (VPS), and Docker containers, tracking performance, earnings, and node uptime can quickly become complex and fragmented. **EarnHub** solves this by providing a unified cockpit to monitor real-time revenue, aggregate bandwidth consumption across devices, inspect API connectivity, and manage node fleets at scale.

### 🌟 Centralized Multi-Account Management
- **Seamless Account Switching**: Switch between multiple provider accounts (e.g. distinct Proxyrack accounts) instantly with persistent state.
- **Aggregated Fleet Overview**: View your combined total balance, pooled network bandwidth usage, and individual account contribution breakdown in one synchronized view.
- **Threshold Progress**: Monitor real-time progress toward minimum payout thresholds with visual completion bars.
- **Zero Login Friction**: Jump across accounts directly from the top navigation bar without logging in or out repeatedly.

🔗 **Live Interactive Demo**: [https://earnhub.2kvn.com/](https://earnhub.2kvn.com/)

---

## 2. Key Features ✨

EarnHub is designed to be lightweight, responsive, and easy to use without unnecessary bloat:

- **Centralized Multi-Account Dashboard**
  - Instant balance metrics, real-time payout progress, and 7-day bandwidth history.
  - One-click health check to ping and verify connectivity across all managed nodes.

- **Fleet-Wide Bandwidth & Traffic Analytics**
  - Multi-device comparative line charts with customizable timeframes (*Today, 7 Days, 30 Days, This Month*).
  - Built-in **5-minute intelligent caching layer** and request throttling to prevent API rate-limiting.

- **Device & Node Fleet Management**
  - Organize and track individual devices with custom labels, IP addresses, geolocations, and operational notes.
  - **Dynamic Prefix Filtering**: Rapidly group and select nodes by naming patterns (e.g., `vps*`, `home*`, `node*`).
  - **Bulk Operations**: Perform batch health pings and batch deletions with direct upstream synchronization.

- **Data Backup & Portability (Import / Export)**
  - Export your complete device and account configurations to JSON or CSV formats.
  - Import device lists from text, JSON, or CSV with duplicate detection and conflict resolution.

- **Built-In Live API Console**
  - Interactive debugging console to execute live calls against upstream endpoints (`/api/balance`, `/api/bandwidth`, `/api/device/status`, `/api/device/add`).
  - Inspect raw request payloads, response headers, HTTP status codes, and latency in milliseconds.
  - Copyable cURL commands for terminal verification.

- **Bilingual Interface (EN / VI)**
  - Full native localization support with one-click toggling between **English (EN 🇺🇸)** and **Vietnamese (VI 🇻🇳)**.

---

## 3. Supported Applications 📋

Running multiple non-conflicting bandwidth sharing and DePIN applications concurrently maximizes revenue from your idle internet connection. The table below lists top passive income applications, network compatibility, deployment limits, major payout options, and **partner registration links** with exclusive bonus incentives:

| Application | Residential / Mobile IP | VPS / Hosting IP | Devices Per Account | Devices Per IP | Major Payout Type | Bonus / Registration Link |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **[Proxyrack Peer](https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l)** | :white_check_mark: | :white_check_mark: | 500 | 1 | PayPal, Crypto (BTC, LTC), Bank Wire | **Official Partner**: Direct API integration & fleet tracking in EarnHub |
| **[EarnApp](https://earnapp.com/i/622el9k)** | :white_check_mark: | :x: | 15 | 1 | PayPal, Amazon Gift Card, Wise | **+$2.00 USD Startup Bonus** credited directly to your starting balance |
| **[Honeygain](https://join.honeygain.com/NJKHA6710A)** | :white_check_mark: | :x: | 10 | 1 | PayPal, Crypto (JumpToken / JMPT) | **+$3.00 USD (3,000 Credits)** instant bonus upon registration |
| **[GetGrass (Wynd)](https://app.grass.io/register?referralCode=7RyLKCgQv0G2Cru)** | :white_check_mark: | :x: | Unlimited | 1 | Crypto (Solana / Grass Claim) | **+5,000 Bonus Points** after 100h uptime & Priority AI Token Airdrop |
| **[Pawns.app](https://pawns.app/?r=177303)** | :white_check_mark: | :x: | Unlimited | 1 | PayPal, Bitcoin, Virtual Visa | **+$3.00 USD Bonus Bundle** ($1.00 instant + $2.00 over first two payouts) |
| **[PacketStream](https://packetstream.io/?psr=a7w)** | :white_check_mark: | :x: | Unlimited | 1 | PayPal | **Packeter VIP Tier**: Stable $0.10/GB sharing rate with $5.00 min cashout |

> 💡 **Pro-Tip**: Residential connections typically earn higher yields than datacenters because AI data scraping networks and ad verification services prioritize clean, genuine residential IP addresses.

---

## 4. Security & Privacy Disclaimer ⚠️

### 🛡️ Client-Side Only Credential Storage (Zero Server-Side Storage)
- **Your Keys Stay on Your Device**: EarnHub **NEVER stores, logs, uploads, or transfers your API keys or account credentials to any server, database, or backend service**.
- **100% Local Storage**: All API keys, account metadata, device records, and custom configurations are stored **strictly within your web browser's local sandbox (`window.localStorage`)**.
- **Direct Client-to-API Communication**: API calls to upstream services (e.g. Proxyrack) are dispatched directly from your browser (or routed through a local development proxy only when necessary to fulfill CORS requirements). At no point does our infrastructure retain, record, or inspect your credentials.
- **Instant Revocation & Purge**: You can wipe all credentials and local records instantly at any time by deleting your accounts within the dashboard or clearing your browser's site data / cache.

### ⚖️ Compliance & Acceptable Use
Before running any bandwidth sharing or network proxy software, ensure your setup complies with applicable local laws and regulations, as well as the Terms of Service and Acceptable Use Policy (AUP) of your Internet Service Provider (ISP), network administrator, or cloud hosting provider. 

EarnHub is an independent, community-driven dashboard utility and is not affiliated with, authorized, maintained, or endorsed by Proxyrack, BrightData, Honeygain, Wynd Network, IPRoyal, or PacketStream. All registered trademarks and company names are the property of their respective owners.

---

## 5. Development & Deployment 💻

### Local Setup
```bash
# Clone the repository
git clone https://github.com/your-username/earnhub.git
cd earnhub

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Production Build
```bash
# Compile and build production assets
npm run build
```

---

## License 📄

This project is licensed under the [MIT License](LICENSE).
