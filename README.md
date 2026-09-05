# ⚡ Hero Haven - Pop-Culture Fandom Merchandise Store

> An authentic merchandise e-commerce platform specializing in **Anime**, **Marvel**, and **DC** merchandise with dedicated Franchise Hubs, Indian payment simulation (UPI, Cards, COD), and a Google Gemini-powered AI Assistant (**J.A.R.V.I.S.**).

---

## 🌟 Features

- **Dynamic Storefront & Multi-Category Filtering**: Posters, Phone Covers, Acrylic Keychains, Vinyl Stickers.
- **Dedicated Franchise & Superhero Vaults (`fandom.html`)**: Themed character portals for *Jujutsu Kaisen*, *Spider-Verse*, *The Batman*, *Demon Slayer*, and *One Piece* with lore quotes and custom color palettes.
- **Collector's Bundle Deals**: 1-click add for curated multi-item setup discounts.
- **Authentic Brand Realism**: Launch Batch #01 tags, archival craftsmanship specs (300+ GSM Cardstock, 10ft Drop Armor, Waterproof Vinyl) with zero fake review counts.
- **Persistent Slide-Over Cart Drawer**: Real-time quantity adjustments, free shipping progress bar (Free delivery over ₹999), and coupon code support (`HAVEN10`).
- **Simulated Indian Checkout**: UPI (interactive QR & VPA verification), RuPay/Visa Cards, and Cash on Delivery (COD).
- **AI Shopping Assistant ("J.A.R.V.I.S.")**: Floating chatbot widget powered by Google Gemini API (`gemini-2.5-flash`) with smart local fallback.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` and add your Google Gemini API key:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
*(Note: The AI chatbot will run automatically in local fallback mode even without an API key!)*

### 3. Run the Server
```bash
npm start
```
Visit `http://localhost:3000` in your web browser.

---

## 📁 Architecture

- `server.js`: Node.js Express backend (Static assets + `/api/chat` proxy)
- `public/index.html`: Main catalog & franchise showcase
- `public/fandom.html`: Dedicated hero & anime franchise vaults
- `public/checkout.html`: 3-step checkout & payment simulator
- `public/data.js`: Catalog inventory & franchise definitions
- `public/app.js`: State management, cart mechanics & filtering
- `public/chatbot.js`: AI shopping wingman widget

---

## 📄 License
MIT License. Created for fans by fans.
