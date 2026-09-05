import { PRODUCTS } from './data.js';

// Application State
const state = {
  products: PRODUCTS,
  activeCategory: 'All',
  activeFandom: 'All',
  searchQuery: '',
  sortBy: 'featured',
  cart: [],
  discountPercent: 0
};

// Initialize Application
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    loadCartFromStorage();
    initEventListeners();
    renderFilteredCatalog();
    updateCartUI();
    initHeroCarousel();
  });
}

// Load cart & applied coupons from localStorage
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('herohaven_cart') || localStorage.getItem('nexus_pop_cart');
    state.cart = saved ? JSON.parse(saved) : [];
    const savedDiscount = localStorage.getItem('herohaven_discount') || localStorage.getItem('nexus_pop_discount');
    state.discountPercent = savedDiscount ? parseFloat(savedDiscount) : 0;
  } catch (err) {
    console.error('Failed to load cart from storage:', err);
    state.cart = [];
    state.discountPercent = 0;
  }
}

// Save cart to localStorage
function saveCartToStorage() {
  try {
    localStorage.setItem('herohaven_cart', JSON.stringify(state.cart));
    localStorage.setItem('herohaven_discount', state.discountPercent.toString());
  } catch (err) {
    console.error('Failed to save cart to storage:', err);
  }
}

// Event Listeners setup
function initEventListeners() {
  // Desktop Search Input & Suggestions
  const searchInput = document.getElementById('searchInput');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      state.searchQuery = val.trim().toLowerCase();
      renderFilteredCatalog();
      updateSearchSuggestions(val, 'searchSuggestions');
    });

    searchInput.addEventListener('focus', () => {
      updateSearchSuggestions(searchInput.value, 'searchSuggestions');
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        hideSearchSuggestions();
        handleSearchSubmit(searchInput.value);
      }
    });

    if (searchSubmitBtn) {
      searchSubmitBtn.addEventListener('click', () => {
        handleSearchSubmit(searchInput.value);
      });
    }
  }

  // Mobile Search Input & Suggestions
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobileSearchSubmitBtn = document.getElementById('mobileSearchSubmitBtn');

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      state.searchQuery = val.trim().toLowerCase();
      renderFilteredCatalog();
      updateSearchSuggestions(val, 'mobileSearchSuggestions');
    });

    mobileSearchInput.addEventListener('focus', () => {
      updateSearchSuggestions(mobileSearchInput.value, 'mobileSearchSuggestions');
    });

    mobileSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        hideSearchSuggestions();
        handleSearchSubmit(mobileSearchInput.value);
      }
    });

    if (mobileSearchSubmitBtn) {
      mobileSearchSubmitBtn.addEventListener('click', () => {
        handleSearchSubmit(mobileSearchInput.value);
      });
    }
  }

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchContainer') && !e.target.closest('#mobileSearchContainer')) {
      hideSearchSuggestions();
    }
  });

  // Global Keyboard shortcuts ('/' to focus, ESC to close)
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== mobileSearchInput && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      searchInput?.focus();
    }
    if (e.key === 'Escape') {
      hideSearchSuggestions();
      closeCart();
    }
  });

  // Category Pills Filter
  const categoryPills = document.querySelectorAll('.cat-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => {
        p.className = 'cat-pill px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-sm';
      });
      pill.className = 'cat-pill active px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-glow-cyan transition-all border border-cyan-400';
      state.activeCategory = pill.getAttribute('data-category');

      // If "All" is clicked, reset BOTH category and universe/fandom so it restores Anime, Marvel, and DC products
      if (state.activeCategory === 'All') {
        state.activeFandom = 'All';
        universeCards.forEach(c => c.classList.remove('ring-2', 'ring-cyan-400'));
      }

      renderFilteredCatalog();
    });
  });

  // Universe Sub-filter Pills
  const universePills = document.querySelectorAll('.fandom-pill');
  universePills.forEach(pill => {
    pill.addEventListener('click', () => {
      universePills.forEach(p => {
        p.className = 'fandom-pill px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 hover:text-white font-medium';
      });
      pill.className = 'fandom-pill px-2.5 py-1 rounded bg-slate-800 text-cyan-400 font-semibold border border-cyan-500/40';
      state.activeFandom = pill.getAttribute('data-fandom');
      renderFilteredCatalog();
    });
  });

  // Big Universe Cards in Hero section
  const universeCards = document.querySelectorAll('.universe-card');
  universeCards.forEach(card => {
    card.addEventListener('click', () => {
      const selectedUniverse = card.getAttribute('data-universe');
      if (state.activeFandom === selectedUniverse) {
        state.activeFandom = 'All';
      } else {
        state.activeFandom = selectedUniverse;
      }

      // Visual feedback on cards
      universeCards.forEach(c => {
        const u = c.getAttribute('data-universe');
        if (state.activeFandom === u) {
          c.classList.add('ring-2', 'ring-cyan-400');
        } else {
          c.classList.remove('ring-2', 'ring-cyan-400');
        }
      });

      // Update sub-pills UI if present
      universePills.forEach(pill => {
        if (pill.getAttribute('data-fandom') === state.activeFandom) {
          pill.className = 'fandom-pill px-2.5 py-1 rounded bg-slate-800 text-cyan-400 font-semibold border border-cyan-500/40';
        } else {
          pill.className = 'fandom-pill px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 hover:text-white font-medium';
        }
      });

      renderFilteredCatalog();
      
      // Smooth scroll to catalog
      document.getElementById('catalogSection')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Sort Dropdown
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderFilteredCatalog();
    });
  }

  // Reset Filters Button
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      state.activeCategory = 'All';
      state.activeFandom = 'All';
      state.searchQuery = '';
      state.sortBy = 'featured';

      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      if (sortSelect) sortSelect.value = 'featured';

      universeCards.forEach(c => c.classList.remove('ring-2', 'ring-cyan-400'));

      categoryPills.forEach((p, idx) => {
        p.className = idx === 0 
          ? 'cat-pill active px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-glow-cyan transition-all border border-cyan-400'
          : 'cat-pill px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-sm';
      });

      universePills.forEach((p, idx) => {
        p.className = idx === 0
          ? 'fandom-pill px-2.5 py-1 rounded bg-slate-800 text-cyan-400 font-semibold border border-cyan-500/40'
          : 'fandom-pill px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 hover:text-white font-medium';
      });

      renderFilteredCatalog();
    });
  }

  // Slide-over Cart Drawer Triggers
  document.getElementById('openCartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
  document.getElementById('cartBackdrop')?.addEventListener('click', closeCart);
  document.getElementById('shopNowBtn')?.addEventListener('click', closeCart);

  // Apply Promo Code
  document.getElementById('applyCouponBtn')?.addEventListener('click', applyPromoCode);
  document.getElementById('couponInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyPromoCode();
    }
  });

  // Global delegate for "Add to Cart" and Quantity adjustments
  document.addEventListener('click', (e) => {
    // Add to cart from grid
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const productId = addBtn.getAttribute('data-id');
      addToCart(productId);
      return;
    }

    // Increment in cart
    const incBtn = e.target.closest('.cart-qty-inc');
    if (incBtn) {
      const productId = incBtn.getAttribute('data-id');
      updateCartQuantity(productId, 1);
      return;
    }

    // Decrement in cart
    const decBtn = e.target.closest('.cart-qty-dec');
    if (decBtn) {
      const productId = decBtn.getAttribute('data-id');
      updateCartQuantity(productId, -1);
      return;
    }

    // Remove from cart
    const removeBtn = e.target.closest('.cart-item-remove');
    if (removeBtn) {
      const productId = removeBtn.getAttribute('data-id');
      removeFromCart(productId);
      return;
    }
  });
}

// Filter and Sort Catalog
function renderFilteredCatalog() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const emptyCatalog = document.getElementById('emptyCatalog');
  const itemCount = document.getElementById('itemCount');

  let filtered = [...state.products];

  // Category filter
  if (state.activeCategory !== 'All') {
    filtered = filtered.filter(p => p.category === state.activeCategory);
  }

  // Fandom/Universe filter
  if (state.activeFandom !== 'All') {
    filtered = filtered.filter(p => p.universe.toLowerCase() === state.activeFandom.toLowerCase());
  }

  // Search filter
  if (state.searchQuery) {
    filtered = filtered.filter(p => {
      const matchName = p.name.toLowerCase().includes(state.searchQuery);
      const matchDesc = p.description.toLowerCase().includes(state.searchQuery);
      const matchTags = p.tags.some(t => t.toLowerCase().includes(state.searchQuery));
      const matchCat = p.category.toLowerCase().includes(state.searchQuery);
      return matchName || matchDesc || matchTags || matchCat;
    });
  }

  // Sorting
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    // Curated featured drops order
  }

  // Update item count indicator
  if (itemCount) {
    itemCount.textContent = filtered.length;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyCatalog?.classList.remove('hidden');
    return;
  }

  emptyCatalog?.classList.add('hidden');

  // Render product cards
  grid.innerHTML = filtered.map(product => {
    const universeColor = product.universe === 'Anime' 
      ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' 
      : product.universe === 'Marvel'
      ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
      : 'border-purple-500/40 text-purple-300 bg-purple-500/10';

    const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return `
      <div class="group bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
        
        <!-- Image & Badges Container -->
        <div class="relative overflow-hidden aspect-[4/3] bg-slate-950">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            loading="lazy"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          >
          
          <!-- Top Tag Badges -->
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${universeColor}">
              ${product.universe}
            </span>
          </div>

          <!-- Category pill -->
          <div class="absolute bottom-3 left-3">
            <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-950/80 text-slate-300 backdrop-blur-sm">
              ${product.category}
            </span>
          </div>

          <!-- Savings Badge -->
          <div class="absolute top-3 right-3 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow">
            ${discountPercent}% OFF
          </div>
        </div>

        <!-- Product Content -->
        <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          
          <div>
            <!-- Title -->
            <h4 class="font-display font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors">
              ${product.name}
            </h4>
          </div>

          <!-- Price & Add Button Row -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-black font-display text-white">₹${product.price}</span>
                <span class="text-xs text-slate-500 line-through">₹${product.originalPrice}</span>
              </div>
              <span class="text-[10px] text-emerald-400 font-semibold">In Stock • Fast Dispatch</span>
            </div>

            <button 
              data-id="${product.id}"
              class="add-to-cart-btn px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan transition-all"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5 stroke-[3]"></i>
              <span>Add</span>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Cart Drawer Open/Close
export function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const panel = document.getElementById('cartPanel');
  if (drawer && panel) {
    drawer.classList.remove('pointer-events-none', 'opacity-0');
    drawer.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
  }
}

export function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const panel = document.getElementById('cartPanel');
  if (drawer && panel) {
    drawer.classList.add('opacity-0');
    drawer.classList.remove('opacity-100');
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');
    setTimeout(() => {
      drawer.classList.add('pointer-events-none');
    }, 300);
  }
}

// Add Item to Cart
export function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      universe: product.universe,
      category: product.category,
      quantity: 1
    });
  }

  saveCartToStorage();
  updateCartUI();
  showToast(`Added "${product.name.slice(0, 24)}..." to stash!`);

  // Animate badge
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.classList.add('scale-125', 'bg-cyan-400');
    setTimeout(() => {
      badge.classList.remove('scale-125', 'bg-cyan-400');
    }, 250);
  }
}

// Update item quantity
function updateCartQuantity(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
  }

  saveCartToStorage();
  updateCartUI();
}

// Remove from cart completely
function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCartToStorage();
  updateCartUI();
  showToast('Item removed from cart', 'rose');
}

// Update Cart Drawer UI
export function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const cartHeaderCount = document.getElementById('cartHeaderCount');
  const cartItemList = document.getElementById('cartItemList');
  const cartEmptyState = document.getElementById('cartEmptyState');
  const cartFooter = document.getElementById('cartFooter');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const discountRow = document.getElementById('discountRow');
  const cartDiscount = document.getElementById('cartDiscount');
  const cartShipping = document.getElementById('cartShipping');
  const cartGrandTotal = document.getElementById('cartGrandTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Total quantity
  const totalCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (badge) badge.textContent = totalCount;
  if (cartHeaderCount) cartHeaderCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

  // Shipping Meter
  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const progressBar = document.getElementById('shippingProgressBar');
  const progressText = document.getElementById('shippingProgressText');

  if (progressBar && progressText) {
    const threshold = 999;
    const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
    progressBar.style.width = `${pct}%`;

    if (subtotal >= threshold) {
      progressText.innerHTML = `
        <span class="text-emerald-400 font-bold flex items-center gap-1">
          <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> You unlocked FREE Express Delivery!
        </span>
        <span class="text-emerald-400 font-bold font-mono">100%</span>
      `;
    } else {
      const needed = threshold - subtotal;
      progressText.innerHTML = `
        <span>Add <strong class="text-white">₹${needed}</strong> for FREE Shipping</span>
        <span class="text-cyan-400 font-mono font-bold">₹${subtotal} / ₹${threshold}</span>
      `;
    }
  }

  // Empty state handling
  if (state.cart.length === 0) {
    if (cartItemList) cartItemList.innerHTML = '';
    cartEmptyState?.classList.remove('hidden');
    cartFooter?.classList.add('opacity-50', 'pointer-events-none');
    if (checkoutBtn) checkoutBtn.removeAttribute('href');
    if (cartSubtotal) cartSubtotal.textContent = '₹0';
    if (cartGrandTotal) cartGrandTotal.textContent = '₹0';
    lucide.createIcons();
    return;
  }

  cartEmptyState?.classList.add('hidden');
  cartFooter?.classList.remove('opacity-50', 'pointer-events-none');
  if (checkoutBtn) checkoutBtn.setAttribute('href', 'checkout.html');

  // Render items in cart drawer
  if (cartItemList) {
    cartItemList.innerHTML = state.cart.map(item => `
      <div class="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
        <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-lg object-cover bg-slate-800 shrink-0">
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-semibold text-white truncate">${item.name}</h5>
          <span class="text-[10px] text-slate-400">${item.universe} • ${item.category}</span>
          <div class="text-xs font-bold text-cyan-400 mt-1">₹${item.price}</div>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button data-id="${item.id}" class="cart-qty-dec w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-300 font-bold text-xs" aria-label="Decrease quantity">
            -
          </button>
          <span class="w-6 text-center text-xs font-mono font-bold text-white">${item.quantity}</span>
          <button data-id="${item.id}" class="cart-qty-inc w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-300 font-bold text-xs" aria-label="Increase quantity">
            +
          </button>
        </div>

        <!-- Remove Trash -->
        <button data-id="${item.id}" class="cart-item-remove p-2 text-slate-500 hover:text-rose-400 transition-colors" title="Remove item">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }

  // Cost calculations
  const shipping = subtotal >= 999 ? 0 : 49;
  const discountAmount = Math.round(subtotal * (state.discountPercent / 100));
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping);

  if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal}`;
  if (cartShipping) cartShipping.textContent = shipping === 0 ? 'FREE' : `₹${shipping}`;

  if (discountAmount > 0 && discountRow && cartDiscount) {
    discountRow.style.display = 'flex';
    cartDiscount.textContent = `-₹${discountAmount}`;
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }

  if (cartGrandTotal) cartGrandTotal.textContent = `₹${grandTotal}`;

  lucide.createIcons();
}

// Apply Promo Code
function applyPromoCode() {
  const input = document.getElementById('couponInput');
  const msg = document.getElementById('couponMessage');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (code === 'HAVEN10' || code === 'NEXUS10') {
    state.discountPercent = 10;
    saveCartToStorage();
    updateCartUI();
    msg.className = 'text-[11px] text-emerald-400 font-semibold';
    msg.textContent = `🎉 10% instant discount applied with ${code}!`;
    msg.classList.remove('hidden');
    showToast(`Coupon ${code} applied (10% OFF)!`);
  } else {
    msg.className = 'text-[11px] text-rose-400 font-semibold';
    msg.textContent = 'Invalid code. Use "HAVEN10" for 10% off.';
    msg.classList.remove('hidden');
  }
}

// Toast notification helper
export function showToast(message, type = 'cyan') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'rose' ? 'border-rose-500/40' : 'border-cyan-500/40';
  const iconColor = type === 'rose' ? 'text-rose-400' : 'text-cyan-400';
  const shadow = type === 'rose' ? 'shadow-glow-crimson' : 'shadow-glow-cyan';

  toast.className = `p-3.5 rounded-xl bg-slate-900/95 border ${borderCol} ${shadow} text-xs text-white flex items-center gap-2.5 transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto backdrop-blur-md`;
  toast.innerHTML = `
    <i data-lucide="${type === 'rose' ? 'alert-circle' : 'check-circle-2'}" class="w-4 h-4 ${iconColor} shrink-0"></i>
    <span class="font-medium">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto remove after 3.2s
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

// Hero Carousel rotation
function initHeroCarousel() {
  const heroImage = document.getElementById('heroImage');
  if (!heroImage) return;

  const heroDrops = [
    {
      img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      title: 'Jujutsu Kaisen: Unlimited Void'
    },
    {
      img: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80',
      title: 'Spider-Man: Into The Spider-Verse'
    },
    {
      img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      title: 'The Batman: I Am The Shadows'
    }
  ];

  let currentIdx = 0;
  setInterval(() => {
    currentIdx = (currentIdx + 1) % heroDrops.length;
    heroImage.style.opacity = '0.3';
    setTimeout(() => {
      heroImage.src = heroDrops[currentIdx].img;
      heroImage.style.opacity = '1';
    }, 350);
  }, 6000);
}

// Add entire bundle of products to cart
export function addBundleToCart(productIds = []) {
  productIds.forEach(id => {
    addToCart(id);
  });
  showToast(`Added collector bundle (${productIds.length} items) to your stash!`, 'cyan');
  openCart();
}

// Global Search Submission Handler
export function handleSearchSubmit(rawQuery) {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) return;

  // Franchise aliases mapping (Supports all variations of superhero / anime search)
  const franchiseMap = {
    // Spider-Man & Spider-Verse
    'spider': 'spiderman',
    'spider-man': 'spiderman',
    'spiderman': 'spiderman',
    'spider man': 'spiderman',
    'spidey': 'spiderman',
    'miles': 'spiderman',
    'miles morales': 'spiderman',
    'peter': 'spiderman',
    'peter parker': 'spiderman',
    'spiderverse': 'spiderman',
    'spider-verse': 'spiderman',
    'across the spider-verse': 'spiderman',
    'into the spider-verse': 'spiderman',

    // Batman & Gotham
    'batman': 'batman',
    'bat man': 'batman',
    'the batman': 'batman',
    'dark knight': 'batman',
    'gotham': 'batman',
    'bruce wayne': 'batman',
    'joker': 'batman',
    'arkham': 'batman',

    // Jujutsu Kaisen
    'jjk': 'jjk',
    'jujutsu': 'jjk',
    'jujutsu kaisen': 'jjk',
    'gojo': 'jjk',
    'satoru': 'jjk',
    'satoru gojo': 'jjk',
    'megumi': 'jjk',
    'fushiguro': 'jjk',
    'sukuna': 'jjk',
    'unlimited void': 'jjk',

    // Demon Slayer
    'demon slayer': 'demonslayer',
    'demonslayer': 'demonslayer',
    'kimetsu': 'demonslayer',
    'kimetsu no yaiba': 'demonslayer',
    'tanjiro': 'demonslayer',
    'nezuko': 'demonslayer',
    'rengoku': 'demonslayer',
    'kyojuro': 'demonslayer',
    'zenitsu': 'demonslayer',
    'inosuke': 'demonslayer',

    // One Piece
    'one piece': 'onepiece',
    'onepiece': 'onepiece',
    'luffy': 'onepiece',
    'monkey d luffy': 'onepiece',
    'gear 5': 'onepiece',
    'zoro': 'onepiece',
    'straw hat': 'onepiece'
  };

  // 1. Direct exact alias match
  if (franchiseMap[query]) {
    window.location.href = `fandom.html?hero=${franchiseMap[query]}`;
    return;
  }

  // 2. Contains franchise keyword (e.g. "spider man poster", "cool batman cover")
  for (const [key, heroId] of Object.entries(franchiseMap)) {
    if (query.includes(key)) {
      window.location.href = `fandom.html?hero=${heroId}`;
      return;
    }
  }

  // 3. Otherwise navigate to search results page
  window.location.href = `fandom.html?search=${encodeURIComponent(query)}`;
}

// Live Autocomplete Suggestions Controller
export function updateSearchSuggestions(rawQuery, containerId = 'searchSuggestions') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const query = (rawQuery || '').trim().toLowerCase();

  if (!query) {
    container.innerHTML = `
      <div class="p-2.5 space-y-3">
        <div>
          <div class="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">🔥 Popular Franchise Hubs</div>
          <div class="grid grid-cols-2 gap-1.5">
            <a href="fandom.html?hero=spiderman" class="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-cyan-400 transition-colors border border-slate-700/40">
              <span class="text-base">🕷️</span> <span class="font-medium">Spider-Verse</span>
            </a>
            <a href="fandom.html?hero=batman" class="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-cyan-400 transition-colors border border-slate-700/40">
              <span class="text-base">🦇</span> <span class="font-medium">The Batman</span>
            </a>
            <a href="fandom.html?hero=jjk" class="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-cyan-400 transition-colors border border-slate-700/40">
              <span class="text-base">⚡</span> <span class="font-medium">Jujutsu Kaisen</span>
            </a>
            <a href="fandom.html?hero=demonslayer" class="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-cyan-400 transition-colors border border-slate-700/40">
              <span class="text-base">🔥</span> <span class="font-medium">Demon Slayer</span>
            </a>
          </div>
        </div>
        <div>
          <div class="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">⚡ Quick Categories</div>
          <div class="flex flex-wrap gap-1.5">
            <a href="fandom.html?search=posters" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700/60">Posters</a>
            <a href="fandom.html?search=covers" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700/60">Phone Covers</a>
            <a href="fandom.html?search=stickers" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700/60">Vinyl Stickers</a>
            <a href="fandom.html?search=keychains" class="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700/60">Keychains</a>
          </div>
        </div>
      </div>
    `;
    container.classList.remove('hidden');
    return;
  }

  // Check if query matches any franchise
  let matchedFranchise = null;
  if (query.includes('spider') || query.includes('miles') || query.includes('peter')) {
    matchedFranchise = { id: 'spiderman', name: 'Spider-Man: Spider-Verse', icon: '🕷️' };
  } else if (query.includes('batman') || query.includes('gotham') || query.includes('dark knight')) {
    matchedFranchise = { id: 'batman', name: 'The Batman & Gotham', icon: '🦇' };
  } else if (query.includes('jjk') || query.includes('jujutsu') || query.includes('gojo') || query.includes('megumi')) {
    matchedFranchise = { id: 'jjk', name: 'Jujutsu Kaisen', icon: '⚡' };
  } else if (query.includes('demon') || query.includes('slayer') || query.includes('rengoku') || query.includes('tanjiro')) {
    matchedFranchise = { id: 'demonslayer', name: 'Demon Slayer: Kimetsu', icon: '🔥' };
  } else if (query.includes('piece') || query.includes('luffy') || query.includes('zoro')) {
    matchedFranchise = { id: 'onepiece', name: 'One Piece: Gear 5', icon: '👒' };
  }

  // Filter matching products
  const matchedProducts = PRODUCTS.filter(p => {
    const matchName = p.name.toLowerCase().includes(query);
    const matchCategory = p.category.toLowerCase().includes(query);
    const matchUniverse = p.universe.toLowerCase().includes(query);
    const matchCraft = (p.craftsmanship || '').toLowerCase().includes(query);
    const matchDesc = p.description.toLowerCase().includes(query);
    const matchTags = p.tags && p.tags.some(t => t.toLowerCase().includes(query));
    return matchName || matchCategory || matchUniverse || matchCraft || matchDesc || matchTags;
  }).slice(0, 4);

  let html = '<div class="space-y-2">';

  if (matchedFranchise) {
    html += `
      <a href="fandom.html?hero=${matchedFranchise.id}" class="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-800 to-slate-900 hover:from-cyan-900/60 hover:to-slate-800 border border-cyan-500/40 hover:border-cyan-400 group transition-all">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">${matchedFranchise.icon}</span>
          <div>
            <div class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">${matchedFranchise.name} Vault</div>
            <div class="text-[10px] text-slate-400">Dedicated hero domain with 1-Click Collector Bundle</div>
          </div>
        </div>
        <span class="text-[11px] font-semibold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Open Vault &rarr;
        </span>
      </a>
    `;
  }

  if (matchedProducts.length > 0) {
    html += `<div class="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2">Products in Vault (${matchedProducts.length})</div>`;
    html += `<div class="space-y-1">`;
    matchedProducts.forEach(p => {
      const targetUrl = p.franchiseKey ? `fandom.html?hero=${p.franchiseKey}` : `fandom.html?search=${encodeURIComponent(p.name)}`;
      html += `
        <a href="${targetUrl}" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/80 transition-colors group">
          <img src="${p.image}" alt="${p.name}" class="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-slate-200 group-hover:text-cyan-400 truncate">${p.name}</div>
            <div class="text-[10px] text-slate-400">${p.category} &bull; ${p.universe}</div>
          </div>
          <div class="text-xs font-bold text-cyan-400 shrink-0">₹${p.price}</div>
        </a>
      `;
    });
    html += `</div>`;
  } else if (!matchedFranchise) {
    html += `
      <div class="p-3 text-center text-xs text-slate-400">
        No immediate drops found for "<span class="text-white font-semibold">${rawQuery}</span>".
        <div class="text-[11px] text-cyan-400 mt-1">Press Enter to search full vault!</div>
      </div>
    `;
  }

  html += `
    <div class="pt-2 border-t border-slate-800/80">
      <button type="button" class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors search-all-btn">
        <span>View all results for "<strong class="text-cyan-400">${rawQuery}</strong>"</span>
        <kbd class="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-400">&crarr; Enter</kbd>
      </button>
    </div>
  </div>`;

  container.innerHTML = html;
  container.classList.remove('hidden');

  const allBtn = container.querySelector('.search-all-btn');
  if (allBtn) {
    allBtn.onclick = () => handleSearchSubmit(rawQuery);
  }
}

export function hideSearchSuggestions() {
  const desktop = document.getElementById('searchSuggestions');
  const mobile = document.getElementById('mobileSearchSuggestions');
  if (desktop) desktop.classList.add('hidden');
  if (mobile) mobile.classList.add('hidden');
}

// Attach helpers to window for easy inline access
if (typeof window !== 'undefined') {
  window.nexusAddToCart = addToCart;
  window.nexusAddBundleToCart = addBundleToCart;
  window.nexusOpenCart = openCart;
  window.nexusCloseCart = closeCart;
  window.nexusHandleSearch = handleSearchSubmit;

  window.havenAddToCart = addToCart;
  window.havenAddBundleToCart = addBundleToCart;
  window.havenOpenCart = openCart;
  window.havenCloseCart = closeCart;
  window.havenHandleSearch = handleSearchSubmit;
}

