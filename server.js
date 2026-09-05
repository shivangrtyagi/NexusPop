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

// AI Chatbot endpoint powered by Google Gemini API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], cart = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

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

    const systemInstruction = `You are "Nexus Jarvis", official AI Shopping Assistant for Nexus Pop (Anime, Marvel, DC merchandise). Recommend items concisely, quote prices in ₹, and suggest code NEXUS10 for 10% off. Free shipping above ₹999.`;

    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const contents = [];
        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 800
          }
        });

        const reply = response.text || "I'm right here! Let me know what merchandise you're hunting for.";
        return res.json({ reply, source: 'gemini' });
      } catch (geminiError) {
        console.warn('Gemini API fallback:', geminiError.message);
        const fallbackReply = generateSmartFallbackReply(message, cart);
        return res.json({ reply: fallbackReply, source: 'local-fallback' });
      }
    } else {
      const fallbackReply = generateSmartFallbackReply(message, cart);
      return res.json({ reply: fallbackReply, source: 'local-fallback' });
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function generateSmartFallbackReply(message, cart = []) {
  const query = message.toLowerCase();
  if (query.includes('cart') || query.includes('bag') || query.includes('checkout') || query.includes('shipping')) {
    if (!cart || cart.length === 0) {
      return `🛒 **Your cart is currently empty!**\n\nCheck out our bestsellers:\n- **Gojo Satoru Foil Poster** (₹499)\n- **Spider-Man Neon Poster** (₹549)\n\n*Pro-Tip:* Orders above **₹999** get **Free Express Shipping** across India! Use coupon **NEXUS10** for 10% off.`;
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const remaining = 999 - total;
    let text = `🛒 **Cart subtotal:** ₹${total}\n`;
    if (remaining > 0) {
      text += `💡 Add **₹${remaining}** more to unlock **Free Express Shipping**!`;
    } else {
      text += `🎉 You qualify for **FREE Shipping**! Use code **NEXUS10** at checkout.`;
    }
    return text;
  }
  if (query.includes('under 500') || query.includes('500') || query.includes('budget')) {
    const under500 = PRODUCTS.filter(p => p.price <= 500).slice(0, 4);
    return `🎯 **Top picks under ₹500:**\n\n` + under500.map(p => `• **${p.name}** — ₹${p.price} (${p.category})`).join('\n') + `\n\n*Use code **NEXUS10** for 10% off!*`;
  }
  if (query.includes('anime') || query.includes('gojo') || query.includes('jujutsu') || query.includes('demon') || query.includes('luffy')) {
    const anime = PRODUCTS.filter(p => p.universe === 'Anime').slice(0, 3);
    return `⚡ **Anime Universe Drops:**\n\n` + anime.map(p => `• **${p.name}** — ₹${p.price}`).join('\n');
  }
  if (query.includes('marvel') || query.includes('spider') || query.includes('iron man')) {
    const marvel = PRODUCTS.filter(p => p.universe === 'Marvel').slice(0, 3);
    return `🛡️ **Marvel Multiverse Picks:**\n\n` + marvel.map(p => `• **${p.name}** — ₹${p.price}`).join('\n');
  }
  if (query.includes('dc') || query.includes('batman') || query.includes('joker')) {
    const dc = PRODUCTS.filter(p => p.universe === 'DC').slice(0, 3);
    return `🦇 **DC Gotham & Metropolis Vault:**\n\n` + dc.map(p => `• **${p.name}** — ₹${p.price}`).join('\n');
  }
  return `👋 **Hey there! I'm Nexus Jarvis, your pop-culture assistant.**\n\nAsk me about:\n- *"Show me anime posters"*\n- *"Items under ₹500"*\n- *"Marvel phone covers"*`;
}

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Nexus Pop Server is live on port: ${PORT}`);
  console.log(`📦 Catalog loaded: ${PRODUCTS.length} merchandise items`);
  console.log(`====================================================`);
});
