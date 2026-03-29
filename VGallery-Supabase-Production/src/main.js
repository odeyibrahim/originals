import './styles/main.css';
import { supabase } from './lib/supabase';
import { secureStorage } from './utils/security';

// App state
let currentProducts = [];
let currentIndex = 0;
let cart = [];
let isAdminMode = false;

// Initialize app
async function init() {
    showLoading(true);
    
    try {
        await loadProducts();
        setupEventListeners();
        checkAdminSession();
        setupRealtimeSubscriptions();
        hideLoading();
    } catch (error) {
        console.error('Init error:', error);
        showNotification('Failed to load gallery', 'error');
        hideLoading();
    }
}

// Load products from Supabase via Netlify function
async function loadProducts() {
    const response = await fetch('/.netlify/functions/get-products');
    const result = await response.json();
    
    if (result.success && result.data) {
        currentProducts = result.data;
        renderCurrentProduct();
        renderGrid();
    } else {
        throw new Error('Failed to load products');
    }
}

// Render current product in main view
function renderCurrentProduct() {
    if (!currentProducts.length || currentIndex >= currentProducts.length) return;
    
    const product = currentProducts[currentIndex];
    
    // Update DOM elements
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('product-author').textContent = product.author || 'V.';
    document.getElementById('product-description').textContent = product.description || '';
    document.getElementById('product-price').textContent = formatPrice(product.base_price);
    
    if (product.compare_at_price) {
        document.getElementById('compare-price').textContent = formatPrice(product.compare_at_price);
        document.getElementById('compare-price').style.display = 'inline';
    }
    
    // Update stock badge
    const stockBadge = document.getElementById('stock-badge');
    if (product.stock <= 0) {
        stockBadge.textContent = 'Sold Out';
        stockBadge.className = 'stock-badge sold-out';
    } else if (product.stock <= 5) {
        stockBadge.textContent = `Low Stock: ${product.stock}`;
        stockBadge.className = 'stock-badge low-stock';
    } else {
        stockBadge.textContent = `In Stock: ${product.stock}`;
        stockBadge.className = 'stock-badge in-stock';
    }
    
    // Update image
    const productImage = document.getElementById('product-image');
    if (product.images && product.images[0]) {
        productImage.src = product.images[0];
        productImage.alt = product.title;
        productImage.classList.add('loaded');
    }
}

// Format price with currency
function formatPrice(price) {
    const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₦';
    return `${currency}${price.toLocaleString()}`;
}

// Setup real-time subscriptions
function setupRealtimeSubscriptions() {
    supabase
        .channel('products-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Product updated:', payload);
                loadProducts(); // Reload products on change
                showNotification('Inventory updated', 'info');
            }
        )
        .subscribe();
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification') || createNotificationElement();
    notification.textContent = message;
    notification.className = `notification ${type} active`;
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

function createNotificationElement() {
    const el = document.createElement('div');
    el.id = 'notification';
    document.body.appendChild(el);
    return el;
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.classList.toggle('active', show);
    }
}

function hideLoading() {
    showLoading(false);
}

function setupEventListeners() {
    // Navigation
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderCurrentProduct();
        }
    });
    
    document.getElementById('next-btn')?.addEventListener('click', () => {
        if (currentIndex < currentProducts.length - 1) {
            currentIndex++;
            renderCurrentProduct();
        }
    });
    
    // Add to cart
    document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
}

function addToCart() {
    const product = currentProducts[currentIndex];
    const quantity = parseInt(document.getElementById('quantity')?.value || 1);
    
    if (product.stock < quantity) {
        showNotification('Insufficient stock', 'error');
        return;
    }
    
    const cartItem = {
        id: product.product_id,
        title: product.title,
        price: product.base_price,
        quantity: quantity,
        image: product.images?.[0]
    };
    
    cart.push(cartItem);
    secureStorage.set('cart', cart);
    updateCartCount();
    showNotification('Added to cart', 'success');
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function renderGrid() {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = currentProducts.map(product => `
        <div class="grid-item" data-id="${product.product_id}">
            <img src="${product.images?.[0] || '/placeholder.jpg'}" alt="${product.title}" loading="lazy">
            <div class="grid-item-info">
                <div class="grid-item-title">${product.title}</div>
                <div class="grid-item-price">${formatPrice(product.base_price)}</div>
                <div class="grid-item-meta">
                    <span>${product.type}</span>
                    <span>${product.stock > 0 ? 'In Stock' : 'Sold Out'}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.grid-item').forEach((item, idx) => {
        item.addEventListener('click', () => {
            currentIndex = idx;
            renderCurrentProduct();
            document.getElementById('grid-overlay')?.classList.remove('active');
        });
    });
}

function checkAdminSession() {
    const token = secureStorage.get('admin_token');
    if (token) {
        // Verify token with server
        fetch('/.netlify/functions/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', token })
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                isAdminMode = true;
                showAdminControls();
            }
        })
        .catch(console.error);
    }
}

function showAdminControls() {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        adminBtn.style.display = 'flex';
    }
}

// Start the app
init();
