import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically locate data.js (supports both ./public/data.js or root ./data.js)
let PRODUCTS = [];
let FRANCHISES = {};
try {
  const dataPath = fs.existsSync(path.join(__dirname, 'public', 'data.js'))
    ? './public/data.js'
    : './data.js';
  const dataMod = await import(dataPath);
  PRODUCTS = dataMod.PRODUCTS || [];
  FRANCHISES = dataMod.FRANCHISES || {};
} catch (err) {
  console.error('Error loading data.js:', err);
}

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Determine static assets directory (./public if exists, otherwise current directory)
const staticDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(staticDir));

// Product catalog endpoint
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    total: PRODUCTS.length,
    products: PRODUCTS
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', store: 'Hero Haven', assistant: 'J.A.R.V.I.S.', timestamp: new Date().toISOString() });
});

// AI Chatbot endpoint powered by Google Gemini API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], cart = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    // Build system instruction with live catalog and cart context
    const catalogSummary = PRODUCTS.map(p => ({
      id: p.id,
      name: p.name,
      universe: p.universe,
      category: p.category,
      price: `₹${p.price}`,
      edition: p.edition,
      badge: p.badge,
      tags: p.tags.join(', '),
      description: p.description
    }));

    const cartSummary = cart && cart.length > 0 
      ? cart.map(item => `${item.name} (Qty: ${item.quantity}, Price: ₹${item.price})`).join('; ')
      : 'Cart is currently empty.';

    const systemInstruction = `You are "J.A.R.V.I.S.", the official AI Shopping Assistant & Pop-Culture Connoisseur for Hero Haven — a premier online merchandise sanctuary specializing in Anime and Superheroes (Posters, Phone Covers, Acrylic Keychains, Vinyl Stickers).

YOUR PERSONALITY:
- Sophisticated, enthusiastic, witty, knowledgeable, concise, and helpful.
- Channel the classic J.A.R.V.I.S. demeanor with a passion for anime, Marvel, and DC lore.
- Make occasional clever fandom references (e.g., Stark Industries engineering, Gojo's infinite void, Batman's contingency plans, Luffy's willpower).

STORE POLICIES & SPECIAL OFFERS:
- Currency: Indian Rupees (₹). Always quote prices with ₹.
- Free Express Delivery all across India on orders above ₹999 (Standard delivery is ₹49 below ₹999).
- Discount Coupon: Use code "HAVEN10" (or "NEXUS10") at checkout for 10% instant discount!
- All stickers are 100% waterproof matte vinyl.
- Phone cases feature 10ft drop military armor protection.
- Posters are printed on 300+ GSM archival matte cardstock.

PRODUCT CATALOG:
${JSON.stringify(catalogSummary, null, 2)}

CURRENT USER CART:
${cartSummary}

YOUR RESPONSIBILITIES:
1. Recommend specific items from the catalog matching their fandom, character, category, or budget (e.g. "under ₹500"). Always specify the exact product name and price in ₹.
2. If asked about cart or shipping, calculate how close they are to the ₹999 free shipping threshold, or suggest complementary items (e.g. pairing a keychain or sticker pack with a poster).
3. Answer fandom trivia or character comparisons and connect them to awesome merchandise in the store.
4. Keep answers concise, visually formatted with bullet points and bold text, avoiding overly long paragraphs.`;

    // Check if real Gemini API key is configured
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        // Format conversation history for Gemini
        const contents = [];
        
        // Add past turns if available (up to last 6 messages)
        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
        
        // Append latest user message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 800
          }
        });

        const reply = response.text || "I'm right here! Let me know what fandom or merchandise you're hunting for.";
        return res.json({ reply, source: 'gemini' });

      } catch (geminiError) {
        console.warn('Gemini API call failed, activating local assistant fallback:', geminiError.message);
        const fallbackReply = generateSmartFallbackReply(message, cart);
        return res.json({ 
          reply: fallbackReply, 
          source: 'local-fallback',
          note: 'Notice: Using local fallback mode. Check server console or API key for details.'
        });
      }
    } else {
      // Graceful local smart assistant fallback when no API key is provided
      const fallbackReply = generateSmartFallbackReply(message, cart);
      return res.json({ 
        reply: fallbackReply, 
        source: 'local-fallback' 
      });
    }

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Heuristic fallback assistant so the app works seamlessly even without an API key
function generateSmartFallbackReply(message, cart = []) {
  const query = message.toLowerCase();

  // Check Cart queries
  if (query.includes('cart') || query.includes('bag') || query.includes('checkout') || query.includes('shipping')) {
    if (!cart || cart.length === 0) {
      return `🛒 **Your cart is currently empty!**\n\nNeed some inspiration? Check out our bestsellers:\n- **Jujutsu Kaisen: Gojo Satoru Foil Poster** (₹499)\n- **Spider-Man: Miles Morales Neon Poster** (₹549)\n- **One Piece: Gear 5 Luffy Sticker Pack** (₹199)\n\n*Pro-Tip:* Orders above **₹999** get **Free Express Shipping** across India! Apply code **HAVEN10** at checkout for 10% off.`;
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const remaining = 999 - total;
    let text = `🛒 **Here's your current cart status:**\n`;
    cart.forEach(i => {
      text += `- **${i.name}** × ${i.quantity} = ₹${i.price * i.quantity}\n`;
    });
    text += `\n**Subtotal:** ₹${total}\n`;
    if (remaining > 0) {
      text += `💡 You are just **₹${remaining}** away from **Free Express Shipping**! Add a sticker pack or acrylic keychain to unlock free delivery!`;
    } else {
      text += `🎉 Excellent! Your order qualifies for **FREE Express Shipping**! Apply code **HAVEN10** for 10% off!`;
    }
    return text;
  }

  // Budget query: under 500 / 300 / 250
  if (query.includes('under 500') || query.includes('under ₹500') || query.includes('500') || query.includes('budget')) {
    const under500 = PRODUCTS.filter(p => p.price <= 500).slice(0, 4);
    let text = `🎯 **Prime Hero Haven drops under ₹500:**\n\n`;
    under500.forEach(p => {
      text += `• **${p.name}** — **₹${p.price}** *(was ₹${p.originalPrice})* [${p.universe} / ${p.category}]\n  *${p.badge}* • ${p.edition}\n`;
    });
    text += `\n*Ready to secure them? Apply coupon **HAVEN10** at checkout for 10% off!*`;
    return text;
  }

  // Fandom: Anime / JJK / Demon Slayer / Naruto / One Piece
  if (query.includes('anime') || query.includes('gojo') || query.includes('jujutsu') || query.includes('demon slayer') || query.includes('naruto') || query.includes('luffy') || query.includes('one piece') || query.includes('titan')) {
    const animeItems = PRODUCTS.filter(p => p.universe === 'Anime');
    let text = `⚡ **Sugoi! Top recommendations from the Anime sanctuary:**\n\n`;
    animeItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  *${p.craftsmanship}* • *${p.description.slice(0, 80)}...*\n`;
    });
    text += `\n💬 *Looking for a phone case, acrylic keychain, or foil poster specifically? Allow me to assist.*`;
    return text;
  }

  // Fandom: Marvel / Spider-Man / Iron Man / Deadpool / Wolverine / Avengers
  if (query.includes('marvel') || query.includes('spider') || query.includes('iron man') || query.includes('deadpool') || query.includes('avengers') || query.includes('loki')) {
    const marvelItems = PRODUCTS.filter(p => p.universe === 'Marvel');
    let text = `🛡️ **Avengers protocol initiated. Top picks from Marvel:**\n\n`;
    marvelItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  *${p.badge}* — ${p.description.slice(0, 80)}...\n`;
    });
    text += `\n💬 *Stark Industries approved engineering with military drop protection and archival prints!*`;
    return text;
  }

  // Fandom: DC / Batman / Joker / Flash / Superman
  if (query.includes('dc') || query.includes('batman') || query.includes('joker') || query.includes('flash') || query.includes('superman')) {
    const dcItems = PRODUCTS.filter(p => p.universe === 'DC');
    let text = `🦇 **Welcome to Gotham & Metropolis. Top DC Haven drops:**\n\n`;
    dcItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  *${p.badge}* — ${p.description.slice(0, 80)}...\n`;
    });
    text += `\n💬 *Dark knight aesthetics and armored accessories ready for immediate dispatch.*`;
    return text;
  }

  // Categories: Posters, Keychains, Stickers, Phone Covers
  if (query.includes('poster') || query.includes('wall')) {
    const posters = PRODUCTS.filter(p => p.category === 'Posters');
    return `🖼️ **Hero Haven Archival Posters (300+ GSM Cardstock):**\n\n` +
      posters.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}]\n  *${p.description}*`).join('\n\n') +
      `\n\n✨ *All posters are shipped in reinforced protective armor tubes.*`;
  }

  if (query.includes('sticker')) {
    const stickers = PRODUCTS.filter(p => p.category === 'Vinyl Stickers');
    return `✨ **Waterproof Vinyl Sticker Packs (Laptop & Hydro-Flask Safe):**\n\n` +
      stickers.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}]`).join('\n') +
      `\n\n🔥 *Combine 2 packs to hit ₹400+ or pair with a keychain!*`;
  }

  if (query.includes('case') || query.includes('cover')) {
    const covers = PRODUCTS.filter(p => p.category === 'Phone Covers');
    return `📱 **Military-Grade 10ft Shockproof Phone Covers:**\n\n` +
      covers.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}]\n  *${p.description}*`).join('\n\n');
  }

  if (query.includes('keychain')) {
    const keychains = PRODUCTS.filter(p => p.category === 'Acrylic Keychains');
    return `🔑 **Crystal Acrylic Swivel Keychains:**\n\n` +
      keychains.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}]`).join('\n') +
      `\n\n🎁 *Pocket-sized collectibles starting at just ₹219!*`;
  }

  // Default friendly guidance
  return `👋 **Greetings! I am J.A.R.V.I.S., your AI shopping assistant for Hero Haven.**

I can assist your search through our multiverse catalog:
- 🌟 Ask: *"Show me Gojo Satoru and Spider-Man merch"*
- 💰 Ask: *"What items do you have under ₹500?"*
- 🎁 Ask: *"Best gift combo for a Batman fan"*
- 🛒 Ask: *"Review my cart and discount code"*

What universe or character shall we explore today? *(Anime, Marvel, or DC)*`;
}

// Fallback to index.html for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Hero Haven Server is live at: http://localhost:${PORT}`);
  console.log(`📦 Catalog loaded: ${PRODUCTS.length} merchandise items`);
  console.log(`🤖 AI Assistant: ${GEMINI_API_KEY ? 'Gemini API Enabled (' + GEMINI_MODEL + ')' : 'Local Smart Fallback Mode (Add GEMINI_API_KEY to .env for full API)'}`);
  console.log(`====================================================`);
});
