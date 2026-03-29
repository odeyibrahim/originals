import './styles/main.css';
import { supabase, subscribeToProducts } from './lib/supabase';
import { secureStorage } from './utils/security';
import { validate, formatPrice } from './utils/validation';

// App State
let products = [];
let currentIndex = 0;
let cart = secureStorage.get('cart') || [];

// DOM Elements
let splitContainer, introOverlay, productImage, productTitle, productDescription;
let productPrice, stockBadge, prevBtn, nextBtn, pageIndicator, gridOverlay;
let gridContainer, checkoutOverlay, checkoutPanel, notification, loading;

// Initialize app
async function init() {
    cacheDOMElements();
    setupEventListeners();
    await loadProducts();
    setupRealtimeSubscription();
    renderCurrentProduct();
    renderGrid();
    updateCartCount();
    hideLoading();
}

function cacheDOMElements() {
    splitContainer = document.getElementById('split-container');
    introOverlay = document.getElementById('intro-overlay');
    productImage = document.getElementById('product-image');
    productTitle = document.getElementById('product-title');
    productDescription = document.getElementById('product-description');
    productPrice = document.getElementById('product-price');
    stockBadge = document.getElementById('stock-badge');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    pageIndicator = document.getElementById('page-indicator');
    gridOverlay = document.getElementById('grid-overlay');
    gridContainer = document.getElementById('grid-container');
    checkoutOverlay = document.getElementById('checkout-overlay');
    checkoutPanel = document.getElementById('checkout-panel');
    notification = document.getElementById('notification');
    loading = document.getElementById('loading');
}

async function loadProducts() {
    showLoading(true);
    try {
        const response = await fetch('/.netlify/functions/get-products');
        const result = await response.json();
        if (result.success) {
            products = result.data;
        } else {
            throw new Error('Failed to load products');
        }
    } catch (error) {
        console.error('Load error:', error);
        showNotification('Failed to load gallery', 'error');
        products = [];
    }
    showLoading(false);
}

function setupRealtimeSubscription() {
    subscribeToProducts((payload) => {
        console.log('Product update:', payload);
        loadProducts();
        showNotification('Inventory updated', 'info');
    });
}

function renderCurrentProduct() {
    if (!products.length || currentIndex >= products.length) return;
    
    const product = products[currentIndex];
    
    productTitle.textContent = product.title;
    productDescription.textContent = product.description || 'No description available';
    productPrice.textContent = formatPrice(product.base_price);
    
    if (product.images && product.images[0]) {
        productImage.src = product.images[0];
        productImage.alt = product.title;
        productImage.classList.add('loaded');
    }
    
    // Update stock badge
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
    
    // Update navigation buttons
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === products.length - 1;
    pageIndicator.textContent = `${currentIndex + 1} / ${products.length}`;
}

function renderGrid() {
    if (!gridContainer) return;
    
    if (!products.length) {
        gridContainer.innerHTML = '<p style="text-align:center; padding:40px;">No products available</p>';
        return;
    }
    
    gridContainer.innerHTML = products.map(product => `
        <div class="grid-item" data-id="${product.product_id}" data-index="${products.indexOf(product)}">
            <img src="${product.images?.[0] || '/placeholder.jpg'}" alt="${product.title}" loading="lazy">
            <div class="grid-item-info">
                <div class="grid-item-title">${escapeHtml(product.title)}</div>
                <div class="grid-item-price">${formatPrice(product.base_price)}</div>
                <div class="grid-item-meta">
                    <span>${product.type || 'Art'}</span>
                    <span>${product.stock > 0 ? '✓ In Stock' : '✗ Sold Out'}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            if (!isNaN(index)) {
                currentIndex = index;
                renderCurrentProduct();
                closeGrid();
            }
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function addToCart() {
    if (!products.length) return;
    
    const product = products[currentIndex];
    const quantity = parseInt(document.getElementById('quantity')?.value || 1);
    
    if (product.stock < quantity) {
        showNotification('Insufficient stock', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === product.product_id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.product_id,
            title: product.title,
            price: product.base_price,
            quantity: quantity,
            image: product.images?.[0]
        });
    }
    
    secureStorage.set('cart', cart);
    updateCartCount();
    showNotification(`Added ${quantity} × ${product.title} to cart`, 'success');
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function openCheckout() {
    renderCheckoutItems();
    checkoutOverlay.classList.add('active');
    checkoutPanel.classList.add('active');
}

function renderCheckoutItems() {
    const container = document.getElementById('checkout-items');
    if (!container) return;
    
    if (!cart.length) {
        container.innerHTML = '<p>Your cart is empty</p>';
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 5000;
    const tax = subtotal * 0.075;
    const total = subtotal + shipping + tax;
    
    container.innerHTML = `
        ${cart.map(item => `
            <div class="cart-item">
                <img src="${item.image || '/placeholder.jpg'}" alt="${item.title}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${escapeHtml(item.title)}</div>
                    <div class="cart-item-price">${formatPrice(item.price)} × ${item.quantity}</div>
                </div>
                <div class="cart-item-total">${formatPrice(item.price * item.quantity)}</div>
            </div>
        `).join('')}
        <div class="cart-summary">
            <div class="summary-row">Subtotal: ${formatPrice(subtotal)}</div>
            <div class="summary-row">Shipping: ${formatPrice(shipping)}</div>
            <div class="summary-row">Tax (7.5%): ${formatPrice(tax)}</div>
            <div class="summary-row total">Total: ${formatPrice(total)}</div>
        </div>
    `;
    
    document.getElementById('checkout-total')?.setAttribute('data-total', total);
}

async function processOrder() {
    const email = document.getElementById('checkout-email')?.value;
    const name = document.getElementById('checkout-name')?.value;
    const phone = document.getElementById('checkout-phone')?.value;
    const address = document.getElementById('checkout-address')?.value;
    const city = document.getElementById('checkout-city')?.value;
    
    if (!validate.email(email)) {
        showNotification('Valid email required', 'error');
        return;
    }
    
    if (!validate.name(name)) {
        showNotification('Name required', 'error');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 5000;
    const tax = subtotal * 0.075;
    
    const orderData = {
        customer_email: email,
        customer_name: name,
        customer_phone: phone,
        customer_address: { line1: address, city: city, state: 'N/A', country: 'NG' },
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        subtotal: subtotal,
        shipping_cost: shipping,
        tax_amount: tax,
        total_amount: subtotal + shipping + tax,
        payment_method: 'paystack'
    };
    
    showLoading(true);
    
    try {
        const response = await fetch('/.netlify/functions/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            cart = [];
            secureStorage.remove('cart');
            updateCartCount();
            closeCheckout();
            showNotification(`Order placed! #${result.orderNumber}`, 'success');
        } else {
            throw new Error(result.error || 'Order failed');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
    
    showLoading(false);
}

function setupEventListeners() {
    // Enter gallery
    document.getElementById('enter-gallery')?.addEventListener('click', () => {
        introOverlay.classList.add('hidden');
        splitContainer.classList.add('active');
    });
    
    // Navigation
    prevBtn?.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderCurrentProduct();
        }
    });
    
    nextBtn?.addEventListener('click', () => {
        if (currentIndex < products.length - 1) {
            currentIndex++;
            renderCurrentProduct();
        }
    });
    
    // Grid
    document.getElementById('grid-icon')?.addEventListener('click', openGrid);
    document.getElementById('close-grid')?.addEventListener('click', closeGrid);
    
    // Cart
    document.getElementById('cart-icon')?.addEventListener('click', openCheckout);
    document.getElementById('close-checkout')?.addEventListener('click', closeCheckout);
    document.getElementById('checkout-overlay')?.addEventListener('click', closeCheckout);
    
    // Add to cart
    document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
    
    // Process order
    document.getElementById('process-order')?.addEventListener('click', processOrder);
    
    // Close overlays on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeGrid();
            closeCheckout();
        }
    });
}

function openGrid() { gridOverlay.classList.add('active'); }
function closeGrid() { gridOverlay.classList.remove('active'); }
function closeCheckout() {
    checkoutOverlay.classList.remove('active');
    checkoutPanel.classList.remove('active');
}

function showNotification(message, type = 'info') {
    if (!notification) return;
    notification.textContent = message;
    notification.className = `notification ${type} active`;
    setTimeout(() => notification.classList.remove('active'), 3000);
}

function showLoading(show) {
    if (!loading) return;
    loading.classList.toggle('active', show);
}

function hideLoading() { showLoading(false); }

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
