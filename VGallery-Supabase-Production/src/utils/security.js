import CryptoJS from 'crypto-js';

// Environment-specific encryption key
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'dev-key-32-chars-long-for-testing!!';

export const secureStorage = {
    set: (key, value) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(value),
                ENCRYPTION_KEY
            ).toString();
            localStorage.setItem(`vgallery_${key}`, encrypted);
            return true;
        } catch {
            return false;
        }
    },
    
    get: (key) => {
        try {
            const encrypted = localStorage.getItem(`vgallery_${key}`);
            if (!encrypted) return null;
            const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch {
            return null;
        }
    },
    
    remove: (key) => {
        localStorage.removeItem(`vgallery_${key}`);
    },
    
    clear: () => {
        Object.keys(localStorage)
            .filter(k => k.startsWith('vgallery_'))
            .forEach(k => localStorage.removeItem(k));
    }
};

export const sanitize = {
    html: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    email: (email) => {
        if (!email) return '';
        return email.trim().toLowerCase().replace(/[<>()[\]\\,;:\s]/g, '');
    },
    
    phone: (phone) => {
        if (!phone) return '';
        return phone.replace(/[^\d+]/g, '');
    },
    
    text: (str, maxLength = 1000) => {
        if (!str) return '';
        return str.trim().substring(0, maxLength);
    }
};

export const rateLimit = {
    attempts: new Map(),
    
    check: (action, limit = 10, windowMs = 60000) => {
        const key = `${action}_${Date.now()}`;
        const now = Date.now();
        const userAttempts = rateLimit.attempts.get(key) || [];
        const recent = userAttempts.filter(t => now - t < windowMs);
        
        if (recent.length >= limit) {
            return { allowed: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
        }
        
        recent.push(now);
        rateLimit.attempts.set(key, recent);
        return { allowed: true };
    }
};

// Generate CSRF token
export const generateCSRFToken = () => {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
};

// Validate email format
export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate phone number (international)
export const isValidPhone = (phone) => {
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/.test(phone);
};
