import Category from '../models/categories.js';

export const matchCategory = async (storeName, description, items) => {
    const categories = await Category.find({});
    
    const keywords = {
        "Thực phẩm": ["food", "restaurant", "cafe", "drink", "snack", "coffee", "ăn", "uống", "quán"],
        "Điện tử": ["electronics", "phone", "laptop", "computer", "tv", "công nghệ", "thiết bị"],
        "Dịch vụ": ["service", "spa", "repair", "sửa chữa", "dịch vụ"],
        "Thời trang": ["clothes", "fashion", "shoes", "túi", "phụ kiện"],
        "Vận chuyển": ["transport", "shipping", "delivery", "logistics", "giao hàng"],
        "Khác": []
    };

    const text = `${storeName} ${description} ${items.map(item => item.name).join(" ")}`.toLowerCase();

    for (const category of categories) {
        if (keywords[category.name] && keywords[category.name].some(keyword => text.includes(keyword))) {
            return category._id;
        }
    }

    return categories.find(c => c.name === "Khác")._id;
};
