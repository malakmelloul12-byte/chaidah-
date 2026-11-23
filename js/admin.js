document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = 'admin123'; // Change this password before deploying
  let products = getProducts();
  let settings = getStoreSettings();

  // Authentication Elements
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboard = document.getElementById('admin-dashboard');

  if (sessionStorage.getItem('lumiere_admin_auth') === 'true') {
    unlockDashboard();
  }

  document.getElementById('admin-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-password-input').value;
    if (input === ADMIN_PASS) {
      sessionStorage.setItem('lumiere_admin_auth', 'true');
      unlockDashboard();
    } else {
      showToast('Incorrect password');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('lumiere_admin_auth');
    location.reload();
  });

  function unlockDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadSettingsForm();
    renderAdminProducts();
  }

  // 1. Store Settings Management
  function loadSettingsForm() {
    document.getElementById('set-store-name').value = settings.storeName;
    document.getElementById('set-hero-tag').value = settings.heroTag;
    document.getElementById('set-hero-title').value = settings.heroTitle;
    document.getElementById('set-hero-subtitle').value = settings.heroSubtitle;
    document.getElementById('set-shipping-fee').value = settings.shippingFee;
    document.getElementById('set-whatsapp').value = settings.whatsappNumber;
    document.getElementById('set-instagram').value = settings.socials.instagram;
    document.getElementById('set-facebook').value = settings.socials.facebook;
    document.getElementById('set-tiktok').value = settings.socials.tiktok;
    document.getElementById('set-snapchat').value = settings.socials.snapchat;
  }

  document.getElementById('store-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    settings = {
      storeName: document.getElementById('set-store-name').value.trim(),
      heroTag: document.getElementById('set-hero-tag').value.trim(),
      heroTitle: document.getElementById('set-hero-title').value.trim(),
      heroSubtitle: document.getElementById('set-hero-subtitle').value.trim(),
      shippingFee: parseFloat(document.getElementById('set-shipping-fee').value) || 0,
      whatsappNumber: document.getElementById('set-whatsapp').value.replace(/\D/g, ''),
      socials: {
        instagram: document.getElementById('set-instagram').value.trim(),
        facebook: document.getElementById('set-facebook').value.trim(),
        tiktok: document.getElementById('set-tiktok').value.trim(),
        snapchat: document.getElementById('set-snapchat').value.trim()
      }
    };

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    showToast('Store settings saved successfully!');
  });

  // 2. Product Add / Edit & Image Upload (Base64 + URL)
  const productForm = document.getElementById('product-form');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const category = document.getElementById('prod-category').value;
    const description = document.getElementById('prod-desc').value.trim();
    const fileInput = document.getElementById('prod-image-file');
    const urlInput = document.getElementById('prod-image-url').value.trim();

    let finalImage = urlInput || 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80';

    // Convert uploaded local image to Base64
    if (fileInput.files && fileInput.files[0]) {
      finalImage = await fileToBase64(fileInput.files[0]);
    } else if (id && !urlInput) {
      // Keep existing image when editing if no new file/URL is provided
      const existing = products.find(p => p.id === id);
      if (existing) finalImage = existing.image;
    }

    if (id) {
      // Update existing product
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        products[index] = { id, name, price, category, description, image: finalImage };
        showToast('Product updated!');
      }
    } else {
      // Add new product
      const newProduct = {
        id: 'prod_' + Date.now(),
        name,
        price,
        category,
        description,
        image: finalImage
      };
      products.unshift(newProduct);
      showToast('New product added!');
    }

    saveProducts();
    resetProductForm();
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  window.editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('product-form-title').textContent = 'Edit Product';
    document.getElementById('save-prod-btn').textContent = 'Update Product';
    cancelEditBtn.classList.remove('hidden');

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-image-url').value = product.image.startsWith('http') ? product.image : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deleteProduct = (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    products = products.filter(p => p.id !== id);
    saveProducts();
    showToast('Product deleted.');
  };

  cancelEditBtn.addEventListener('click', resetProductForm);

  function resetProductForm() {
    productForm.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('product-form-title').textContent = 'Add New Product';
    document.getElementById('save-prod-btn').textContent = 'Add Product';
    cancelEditBtn.classList.add('hidden');
  }

  function saveProducts() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    renderAdminProducts();
  }

  function renderAdminProducts() {
    document.getElementById('inventory-count').textContent = products.length;
    const list = document.getElementById('admin-product-list');

    list.innerHTML = products.map(p => `
      <div class="admin-product-item">
        <div class="admin-prod-meta">
          <img src="${p.image}" alt="${p.name}" />
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:0.85rem;color:#666;">$${Number(p.price).toFixed(2)} • ${p.category}</div>
          </div>
        </div>
        <div class="admin-prod-actions">
          <button class="btn btn-outline" style="padding:6px 12px;" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn-danger-outline" style="padding:6px 12px;" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Reset to Default Data
  document.getElementById('reset-defaults-btn').addEventListener('click', () => {
    if (!confirm('Reset all products and settings to original defaults?')) return;
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    products = DEFAULT_PRODUCTS;
    settings = DEFAULT_SETTINGS;
    loadSettingsForm();
    renderAdminProducts();
    showToast('Store reset to default data.');
  });

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
});
