document.addEventListener('DOMContentLoaded', () => {
  const settings = getStoreSettings();
  const products = getProducts();
  let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
  let activeCategory = 'all';

  // Stripe Placeholder Key (Replace with your live pk_live_... key when integrating Stripe SDK)
  const STRIPE_PUBLIC_KEY = 'pk_test_51PlaceholderYourStripeKeyHere';

  // DOM Elements
  const productGrid = document.getElementById('product-grid');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCountBadge = document.getElementById('cart-count');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');

  // 1. Apply Dynamic Store Settings
  function applyStoreSettings() {
    document.title = `${settings.storeName} | Skincare & Body Care`;
    document.getElementById('store-logo').innerHTML = `${settings.storeName}<span>.</span>`;
    document.getElementById('footer-brand-name').textContent = settings.storeName;
    document.getElementById('hero-tag').textContent = settings.heroTag;
    document.getElementById('hero-title').textContent = settings.heroTitle;
    document.getElementById('hero-subtitle').textContent = settings.heroSubtitle;
    document.getElementById('year').textContent = new Date().getFullYear();

    // Social Links
    document.getElementById('link-instagram').href = settings.socials.instagram || '#';
    document.getElementById('link-facebook').href = settings.socials.facebook || '#';
    document.getElementById('link-tiktok').href = settings.socials.tiktok || '#';
    document.getElementById('link-snapchat').href = settings.socials.snapchat || '#';
    document.getElementById('link-whatsapp').href = `https://wa.me/${settings.whatsappNumber}`;
  }

  // 2. Render Products
  function renderProducts() {
    const filtered = activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory);

    if (filtered.length === 0) {
      productGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">No products found in this category.</p>`;
      return;
    }

    productGrid.innerHTML = filtered.map(product => `
      <article class="product-card">
        <div class="product-img-wrap">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-info">
          <span class="product-cat">${product.category}</span>
          <h3>${product.name}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-bottom">
            <span class="product-price">$${Number(product.price).toFixed(2)}</span>
            <button class="btn btn-primary" onclick="addToCart('${product.id}')">Add to Bag</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  // 3. Category Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // 4. Cart Management
  window.addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }

    saveAndRenderCart();
    showToast(`Added "${product.name}" to your bag`);
  };

  window.updateQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }
    saveAndRenderCart();
  };

  function saveAndRenderCart() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountBadge.textContent = totalItems;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align:center;color:#666;margin-top:40px;">Your shopping bag is empty.</p>`;
      subtotalEl.textContent = '$0.00';
      shippingEl.textContent = '$0.00';
      totalEl.textContent = '$0.00';
      return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
          </div>
        </div>
      </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = Number(settings.shippingFee);
    const grandTotal = subtotal + shipping;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    shippingEl.textContent = `$${shipping.toFixed(2)}`;
    totalEl.textContent = `$${grandTotal.toFixed(2)}`;
  }

  // Drawer Controls
  const toggleCart = (open) => {
    cartDrawer.classList.toggle('open', open);
    cartOverlay.classList.toggle('open', open);
  };

  document.getElementById('open-cart-btn').addEventListener('click', () => toggleCart(true));
  document.getElementById('close-cart-btn').addEventListener('click', () => toggleCart(false));
  cartOverlay.addEventListener('click', () => toggleCart(false));

  // Helper: Validate Customer Delivery Info
  function getCustomerInfo() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();

    if (cart.length === 0) {
      showToast('Your cart is empty!');
      return null;
    }
    if (!name || !phone || !address) {
      showToast('Please fill in your Name, Phone, and Delivery Address.');
      return null;
    }
    return { name, phone, address };
  }

  // 5. Option A: WhatsApp Order Checkout
  document.getElementById('checkout-whatsapp-btn').addEventListener('click', () => {
    const customer = getCustomerInfo();
    if (!customer) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = Number(settings.shippingFee);
    const total = subtotal + shipping;

    let message = `*New Order - ${settings.storeName}*\n\n`;
    message += `*Customer Details:*\n`;
    message += `• Name: ${customer.name}\n`;
    message += `• Phone: ${customer.phone}\n`;
    message += `• Address: ${customer.address}\n\n`;
    message += `*Order Items:*\n`;

    cart.forEach(item => {
      message += `• ${item.qty}x ${item.name} ($${(item.price * item.qty).toFixed(2)})\n`;
    });

    message += `\n*Subtotal:* $${subtotal.toFixed(2)}\n`;
    message += `*Shipping:* $${shipping.toFixed(2)}\n`;
    message += `*Total Due:* $${total.toFixed(2)}`;

    const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  });

  // 6. Option B: Credit / Debit Card Checkout
  const cardModal = document.getElementById('card-modal');

  document.getElementById('checkout-card-btn').addEventListener('click', () => {
    const customer = getCustomerInfo();
    if (!customer) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = subtotal + Number(settings.shippingFee);

    document.getElementById('modal-total-amount').textContent = `$${total.toFixed(2)}`;
    toggleCart(false);
    cardModal.classList.add('open');
  });

  document.getElementById('close-card-modal').addEventListener('click', () => {
    cardModal.classList.remove('open');
  });

  document.getElementById('card-payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const payBtn = document.getElementById('confirm-card-pay');
    payBtn.textContent = 'Processing Payment...';
    payBtn.disabled = true;

    // Simulated Stripe/Payment Gateway Confirmation
    setTimeout(() => {
      console.log('Processed with Stripe Key:', STRIPE_PUBLIC_KEY);
      cart = [];
      saveAndRenderCart();
      cardModal.classList.remove('open');
      payBtn.textContent = 'Confirm & Pay Now';
      payBtn.disabled = false;
      e.target.reset();
      showToast('Payment successful! Thank you for your order.');
    }, 1400);
  });

  // Toast Utility
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // Initialize Store
  applyStoreSettings();
  renderProducts();
  saveAndRenderCart();
});
