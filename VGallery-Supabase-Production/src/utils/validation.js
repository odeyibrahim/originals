export const validate = {
    email: (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    name: (name) => {
        return name && name.length >= 2 && name.length <= 100;
    },
    
    quantity: (qty, maxStock) => {
        const num = parseInt(qty);
        return !isNaN(num) && num >= 1 && num <= maxStock;
    },
    
    phone: (phone) => {
        return /^[\+]?[0-9]{10,15}$/.test(phone);
    },
    
    address: (address) => {
        return address && address.line1 && address.city && address.state;
    }
};

export const formatPrice = (price, currency = 'NGN') => {
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || '₦';
    return `${symbol}${price.toLocaleString()}`;
};
