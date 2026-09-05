// Nexus Pop - AI Fandom Shopping Assistant Widget (Powered by Google Gemini API)

class NexusChatbot {
  constructor() {
    this.history = [];
    this.isOpen = false;
    this.initElements();
    this.bindEvents();
    this.renderWelcomeMessage();
  }

  initElements() {
    this.openBtn = document.getElementById('openChatBtn');
    this.navChatBtn = document.getElementById('navChatBtn');
    this.heroChatTrigger = document.getElementById('heroChatTrigger');
    this.closeBtn = document.getElementById('closeChatBtn');
    this.clearBtn = document.getElementById('clearChatBtn');
    this.chatPanel = document.getElementById('chatPanel');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatForm = document.getElementById('chatForm');
    this.chatInput = document.getElementById('chatInput');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.chips = document.querySelectorAll('.chat-chip');
  }

  bindEvents() {
    // Open/Close Toggles
    this.openBtn?.addEventListener('click', () => this.toggleChat());
    this.navChatBtn?.addEventListener('click', () => this.openChat());
    this.heroChatTrigger?.addEventListener('click', () => this.openChat());
    this.closeBtn?.addEventListener('click', () => this.closeChat());
    this.clearBtn?.addEventListener('click', () => this.clearChat());

    // Submit user message
    this.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = this.chatInput.value.trim();
      if (!message) return;
      this.sendMessage(message);
      this.chatInput.value = '';
    });

    // Quick Prompt Chips
    this.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.trim().replace(/^[\u200B\s]+|[\u200B\s]+$/g, '');
        this.openChat();
        this.sendMessage(text);
      });
    });
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.chatPanel.classList.remove('hidden');
    this.chatPanel.classList.add('flex');
    this.chatInput.focus();
    this.scrollToBottom();
  }

  closeChat() {
    this.isOpen = false;
    this.chatPanel.classList.add('hidden');
    this.chatPanel.classList.remove('flex');
  }

  clearChat() {
    this.history = [];
    this.chatMessages.innerHTML = '';
    this.renderWelcomeMessage();
  }

  renderWelcomeMessage() {
    const welcome = `👋 **Hey there, fellow fan! I'm Nexus Jarvis, your pop-culture shopping wingman.**

I know every corner of our Anime, Marvel, and DC vault:
• Ask me: *"Show me Gojo Satoru and Spider-Man gear"*
• Ask me: *"What do you have under ₹500?"*
• Ask me: *"How close am I to free shipping?"*
• Ask me: *"Recommend a gift combo for a Batman fan"*

What universe are we diving into today?`;
    this.appendBotMessage(welcome, false);
  }

  async sendMessage(userText) {
    // Append User Message to UI
    this.appendUserMessage(userText);
    this.scrollToBottom();

    // Show Typing Indicator
    this.typingIndicator.classList.remove('hidden');
    this.scrollToBottom();

    // Get current cart from localStorage for full context
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('nexus_pop_cart')) || [];
    } catch (e) {
      cart = [];
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userText,
          history: this.history,
          cart: cart
        })
      });

      const data = await response.json();
      this.typingIndicator.classList.add('hidden');

      if (data && data.reply) {
        // Record in conversation history
        this.history.push({ role: 'user', text: userText });
        this.history.push({ role: 'model', text: data.reply });

        // Render AI Message
        this.appendBotMessage(data.reply);
      } else {
        this.appendBotMessage("⚠️ My multiverse comms hit a glitch! Feel free to ask me again or browse the catalog.", true);
      }
    } catch (err) {
      console.error('Chat API Error:', err);
      this.typingIndicator.classList.add('hidden');
      this.appendBotMessage("⚠️ Looks like the comms link is down. Make sure the Node server is running at `http://localhost:3000`!", true);
    }

    this.scrollToBottom();
  }

  appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-end';
    bubble.innerHTML = `
      <div class="max-w-[85%] bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow text-xs">
        ${this.escapeHtml(text)}
      </div>
    `;
    this.chatMessages.appendChild(bubble);
  }

  appendBotMessage(text, isError = false) {
    const bubble = document.createElement('div');
    bubble.className = 'flex gap-2.5 items-start';

    const formattedContent = this.formatMarkdown(text);

    bubble.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
        <i data-lucide="bot" class="w-3.5 h-3.5"></i>
      </div>
      <div class="max-w-[88%] bg-slate-950/80 border ${isError ? 'border-rose-500/40 text-rose-300' : 'border-slate-800 text-slate-200'} rounded-2xl rounded-tl-sm p-3 shadow-md space-y-1 leading-relaxed text-xs">
        ${formattedContent}
      </div>
    `;
    this.chatMessages.appendChild(bubble);
    lucide.createIcons();
  }

  formatMarkdown(text) {
    if (!text) return '';

    // Bold **text**
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');

    // Italics *text*
    parsed = parsed.replace(/\*(.*?)\*/g, '<em class="text-slate-400">$1</em>');

    // Bullet points: • or -
    parsed = parsed.replace(/(?:^|\n)[•\-]\s+(.+)/g, '<div class="flex items-start gap-1.5 my-1 ml-1"><span class="text-cyan-400 font-bold shrink-0">•</span><span>$1</span></div>');

    // Highlight prices in ₹
    parsed = parsed.replace(/(₹\d+)/g, '<span class="text-cyan-400 font-bold font-mono">$1</span>');

    // Convert newlines to breaks
    parsed = parsed.replace(/\n\n/g, '<div class="h-2"></div>');
    parsed = parsed.replace(/\n/g, '<br>');

    return parsed;
  }

  escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
      setTimeout(() => {
        if (this.chatMessages) {
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }, 100);
    }
  }
}

// Initialize Chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.nexusChatbot = new NexusChatbot();
});
