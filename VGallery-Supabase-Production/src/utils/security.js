import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'dev-key-32-chars-long-for-testing!!';

export const secureStorage = {
    set: (key, value) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
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
    email: (email) => email?.trim().toLowerCase() || '',
    text: (str) => str?.trim().substring(0, 1000) || ''
};

export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
