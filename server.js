import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { PRODUCTS } from './public/data.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Product catalog endpoint
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    total: PRODUCTS.length,
    products: PRODUCTS
  });
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
      rating: p.rating,
      badge: p.badge,
      tags: p.tags.join(', '),
      description: p.description
    }));

    const cartSummary = cart && cart.length > 0 
      ? cart.map(item => `${item.name} (Qty: ${item.quantity}, Price: ₹${item.price})`).join('; ')
      : 'Cart is currently empty.';

    const systemInstruction = `You are "Nexus Jarvis" (aka "Nexus Senpai"), the official AI Shopping Assistant & Pop-Culture Fandom Connoisseur for Nexus Pop — a premier online merchandise store specializing in Anime, Marvel, and DC merchandise (Posters, Phone Covers, Acrylic Keychains, Vinyl Stickers).

YOUR PERSONALITY:
- Enthusiastic, witty, pop-culture geek, friendly, and concise.
- Talk like a knowledgeable buddy who loves anime, Marvel comics, and DC cinema.
- Make occasional natural fandom references (e.g., Satoru Gojo's infinite void, Tony Stark's engineering genius, Batman's prep time, Luffy's appetite).

STORE POLICIES & SPECIAL OFFERS:
- Currency: Indian Rupees (₹). Always quote prices with ₹.
- Free Express Delivery all across India on orders above ₹999 (Standard delivery is ₹49 below ₹999).
- Discount Coupon: Use code "NEXUS10" at checkout for 10% instant discount!
- All stickers are 100% waterproof matte vinyl.
- Phone cases feature 10ft drop protection.
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
      return `🛒 **Your cart is currently empty!**\n\nNeed some inspiration? Check out our bestsellers:\n- **Jujutsu Kaisen: Gojo Satoru Foil Poster** (₹499)\n- **Spider-Man: Miles Morales Neon Poster** (₹549)\n- **One Piece: Gear 5 Luffy Sticker Pack** (₹199)\n\n*Pro-Tip:* Orders above **₹999** get **Free Express Shipping** across India! Apply code **NEXUS10** at checkout for 10% off.`;
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
      text += `🎉 Awesome! Your order qualifies for **FREE Express Shipping**! Don't forget to use code **NEXUS10** for 10% off!`;
    }
    return text;
  }

  // Budget query: under 500 / 300 / 250
  if (query.includes('under 500') || query.includes('under ₹500') || query.includes('500') || query.includes('budget')) {
    const under500 = PRODUCTS.filter(p => p.price <= 500).slice(0, 4);
    let text = `🎯 **Epic picks under ₹500 for true fans:**\n\n`;
    under500.forEach(p => {
      text += `• **${p.name}** — **₹${p.price}** *(was ₹${p.originalPrice})* [${p.universe} / ${p.category}]\n  *${p.badge}* • ⭐ ${p.rating}/5.0\n`;
    });
    text += `\n*Want to seal the deal? Add any two items to your cart and apply coupon **NEXUS10**!*`;
    return text;
  }

  // Fandom: Anime / JJK / Demon Slayer / Naruto / One Piece
  if (query.includes('anime') || query.includes('gojo') || query.includes('jujutsu') || query.includes('demon slayer') || query.includes('naruto') || query.includes('luffy') || query.includes('one piece') || query.includes('titan')) {
    const animeItems = PRODUCTS.filter(p => p.universe === 'Anime');
    let text = `⚡ **Sugoi! Top recommendations for the Anime fandom:**\n\n`;
    animeItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  ⭐ ${p.rating} (${p.reviewsCount} reviews) • *${p.description.slice(0, 80)}...*\n`;
    });
    text += `\n💬 *Looking for a phone case, acrylic keychain, or foil poster specifically? Let me know!*`;
    return text;
  }

  // Fandom: Marvel / Spider-Man / Iron Man / Deadpool / Wolverine / Avengers
  if (query.includes('marvel') || query.includes('spider') || query.includes('iron man') || query.includes('deadpool') || query.includes('avengers') || query.includes('loki')) {
    const marvelItems = PRODUCTS.filter(p => p.universe === 'Marvel');
    let text = `🛡️ **Avengers assemble! Top picks from the Marvel Multiverse:**\n\n`;
    marvelItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  ⭐ ${p.rating} • *${p.badge}* — ${p.description.slice(0, 80)}...\n`;
    });
    text += `\n💬 *Tony Stark approved engineering with MagSafe tech and holographic foil prints!*`;
    return text;
  }

  // Fandom: DC / Batman / Joker / Flash / Superman
  if (query.includes('dc') || query.includes('batman') || query.includes('joker') || query.includes('flash') || query.includes('superman')) {
    const dcItems = PRODUCTS.filter(p => p.universe === 'DC');
    let text = `🦇 **Welcome to Gotham & Metropolis! Top DC Universe drops:**\n\n`;
    dcItems.slice(0, 3).forEach(p => {
      text += `• **${p.name}** — **₹${p.price}**\n  ⭐ ${p.rating} • *${p.badge}* — ${p.description.slice(0, 80)}...\n`;
    });
    text += `\n💬 *Dark knight aesthetics and speed-force neon keychains ready to dispatch!*`;
    return text;
  }

  // Categories: Posters, Keychains, Stickers, Phone Covers
  if (query.includes('poster') || query.includes('wall')) {
    const posters = PRODUCTS.filter(p => p.category === 'Posters');
    return `🖼️ **Nexus Pop Premium Posters (300+ GSM Cardstock):**\n\n` +
      posters.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}] (⭐ ${p.rating})\n  *${p.description}*`).join('\n\n') +
      `\n\n✨ *All posters come securely packed in hard protective tubes!*`;
  }

  if (query.includes('sticker')) {
    const stickers = PRODUCTS.filter(p => p.category === 'Vinyl Stickers');
    return `✨ **Waterproof Vinyl Sticker Packs (Dishwasher & Laptop Safe):**\n\n` +
      stickers.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}] (⭐ ${p.rating})`).join('\n') +
      `\n\n🔥 *Grab 2 packs to hit ₹400+ or pair with a keychain!*`;
  }

  if (query.includes('case') || query.includes('cover')) {
    const covers = PRODUCTS.filter(p => p.category === 'Phone Covers');
    return `📱 **Military-Grade Shockproof Phone Covers:**\n\n` +
      covers.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}] (⭐ ${p.rating})\n  *${p.description}*`).join('\n\n');
  }

  if (query.includes('keychain')) {
    const keychains = PRODUCTS.filter(p => p.category === 'Acrylic Keychains');
    return `🔑 **Crystal Acrylic Swivel Keychains:**\n\n` +
      keychains.map(p => `• **${p.name}** — **₹${p.price}** [${p.universe}] (⭐ ${p.rating})`).join('\n') +
      `\n\n🎁 *Perfect pocket-sized gifts starting at just ₹219!*`;
  }

  // Default friendly guidance
  return `👋 **Hey there, fellow fan! I'm Nexus Jarvis, your pop-culture shopping wingman.**

I can help you uncover the best merchandise in our vault:
- 🌟 Ask me: *"Show me Gojo Satoru and Spider-Man merch"*
- 💰 Ask me: *"What do you have under ₹500?"*
- 🎁 Ask me: *"Best gift combo for a Batman fan"*
- 🛒 Ask me: *"Review my cart and shipping discount"*

What universe or character are we exploring today? *(Anime, Marvel, or DC)*`;
}

// Fallback to index.html for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Nexus Pop Server is live at: http://localhost:${PORT}`);
  console.log(`📦 Catalog loaded: ${PRODUCTS.length} merchandise items`);
  console.log(`🤖 AI Assistant: ${GEMINI_API_KEY ? 'Gemini API Enabled (' + GEMINI_MODEL + ')' : 'Local Smart Fallback Mode (Add GEMINI_API_KEY to .env for full API)'}`);
  console.log(`====================================================`);
});
