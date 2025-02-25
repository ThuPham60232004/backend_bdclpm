import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Category from '../models/categories.js';
import Income from '../models/income.js';
import moment from 'moment';
import axios from 'axios';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY; // Thêm khóa API tỷ giá vào .env

// Hàm chuyển đổi từ tiền ngoại tệ sang VND
const convertToVND = async (amount, currency) => {
    try {
        if (currency === 'VND') return parseFloat(amount);
        
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${currency}`);
        const exchangeRate = response.data?.conversion_rates?.VND;

        if (!exchangeRate) {
            console.warn(`Không tìm thấy tỷ giá cho ${currency}, giữ nguyên giá trị gốc.`);
            return parseFloat(amount);
        }

        return parseFloat(amount) * exchangeRate;
    } catch (error) {
        console.error("Lỗi chuyển đổi tiền tệ:", error);
        return parseFloat(amount); // Trả về giá trị ban đầu nếu có lỗi
    }
};

export const processTextWithGemini = async (req, res) => {
    try {
        const { extractedText } = req.body;
        if (!extractedText) {
            return res.status(400).json({ status: 'error', message: 'Không có văn bản hóa đơn được cung cấp' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
            Phân tích và trích xuất thông tin từ văn bản hóa đơn sau dưới dạng JSON:
            {
              "storeName": "Tên cửa hàng",
              "totalAmount": "Tổng số tiền",
              "currency": "Loại tiền tệ",
              "date": "Ngày mua (ISO format)",
              "items": [
                { "name": "Tên sản phẩm", "quantity": "Số lượng", "price": "Giá" }
              ],
              "category": {
                "name": "Tên danh mục",
                "description": "Mô tả chi tiêu",
                "icon": "Biểu tượng danh mục (emoji hoặc URL)"
              }
            }
            Văn bản hóa đơn: "${extractedText}"
        `;

        const result = await model.generateContent([prompt]);
        const response = await result.response;
        let rawText = response.text().trim();
        rawText = rawText.replace(/```json|```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch (jsonError) {
            console.error("Lỗi JSON:", jsonError);
            return res.status(500).json({ status: 'error', message: 'Lỗi xử lý JSON từ AI' });
        }

        parsedData.date = moment(parsedData.date, moment.ISO_8601, true).isValid()
            ? moment(parsedData.date).format('YYYY-MM-DD')
            : moment().format('YYYY-MM-DD');

        if (!parsedData.currency || parsedData.currency === "Không xác định" || parsedData.currency === "VNĐ") {
            if (/\$/.test(extractedText)) {
                parsedData.currency = "USD";
            } else if (/€/.test(extractedText)) {
                parsedData.currency = "EUR";
            } else if (/¥/.test(extractedText)) {
                parsedData.currency = "JPY";
            } else {
                parsedData.currency = "VND";
            }
        }

        if (!parsedData.totalAmount && parsedData.items?.length > 0) {
            parsedData.totalAmount = parsedData.items.reduce((total, item) => {
                const quantity = parseFloat(item.quantity) || 1;
                const price = parseFloat(item.price) || 0;
                return total + quantity * price;
            }, 0).toFixed(2);
        }

        const matchedCategory = await Category.findOne({ name: parsedData.category.name });
        parsedData.category = matchedCategory ? {
            _id: matchedCategory._id,
            name: matchedCategory.name,
            description: matchedCategory.description,
            icon: matchedCategory.icon
        } : {
            _id: "678cf12ee729fb9da6737256",
            name: "Khác",
            description: "Các mặt hàng khác",
            icon: "category"
        };

        const totalAmount = parsedData.totalAmount;
        const description = `Chi tiêu tổng cộng ${totalAmount} ${parsedData.currency} các mặt hàng trong danh mục ${parsedData.category.name}.`;
        parsedData.category.description = description;

        // Chuyển đổi sang VND nếu cần thiết
        parsedData.totalAmountVND = await convertToVND(parsedData.totalAmount, parsedData.currency);

        res.json({
            status: 'success',
            data: parsedData
        });
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const userSessions = {}; 
export const handleIncomeCommand = async (req, res) => {
    try {
        const { message, userId } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ status: 'error', message: 'thiếu thông tin tin nhắn hoặc userId' });
        }

        const userMessage = message.trim().toLowerCase();
        if (!userSessions[userId]) {
            userSessions[userId] = { amount: null, description: null, date: null, confirmed: false };
        }
        const session = userSessions[userId];
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const responses = [
            { keywords: ['chi tiêu', 'đầu tư', 'spending', 'investment'], message: 'đây là một câu hỏi về tài chính. bạn có thể cung cấp thêm thông tin để tôi hỗ trợ chi tiết hơn về chi tiêu hoặc đầu tư?' },
            { keywords: ['chào', 'giới thiệu', 'hello', 'introduce', 'hi', 'helo', 'halo', 'xin chào'], message: 'chào bạn! tôi là trợ lý tài chính của bạn. tôi có thể giúp bạn quản lý chi tiêu, đầu tư hoặc giải thích các khái niệm tài chính. bạn cần giúp gì ngay bây giờ?' },
            { keywords: ['khái niệm', 'định nghĩa', 'concept', 'definition'], message: 'bạn muốn tôi giải thích khái niệm nào trong tài chính? ví dụ như tiết kiệm, đầu tư hay tỷ lệ lạm phát?' }
        ];

        for (let response of responses) {
            if (response.keywords.some(keyword => userMessage.includes(keyword))) {
                return res.json({ status: 'success', message: response.message });
            }
        }

        const prompt = `bạn là một trợ lý tài chính. hãy phân tích tin nhắn và trả về json với cấu trúc: { "amount": <số tiền dạng số>, "description": "<mô tả>", "date": "<yyyy-mm-dd hoặc yyyy-mm hoặc yyyy>" } nếu thiếu dữ liệu, hãy để giá trị là null. tin nhắn: "${message}"`;

        const result = await model.generateContent([prompt]);
        const response = await result.response;
        let rawText = await response.text();
        rawText = rawText.replace(/```json|```/gi, '').trim();
        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch (error) {
            return res.json({
                status: 'pending',
                message: `không thể phân tích tin nhắn, vui lòng nhập lại${response}`,
            });
        }

        if (parsedData.amount) session.amount = Number(parsedData.amount);
        if (parsedData.description) session.description = parsedData.description.trim();
        if (parsedData.date) session.date = parsedData.date.trim();

        if (session.date) {
            if (/^\d{4}-\d{2}$/.test(session.date)) {
                return res.json({ status: 'pending', message: `bạn đã nhập tháng ${session.date.split('-')[1]}/${session.date.split('-')[0]}. hãy nhập thêm ngày cụ thể (vd: 15/${session.date.split('-')[1]}/${session.date.split('-')[0]})` });
            }
            if (/^\d{4}$/.test(session.date)) {
                return res.json({ status: 'pending', message: `bạn đã nhập năm ${session.date}. hãy nhập thêm tháng & ngày cụ thể (vd: 01/06/${session.date})` });
            }
            if (!moment(session.date, 'YYYY-MM-DD', true).isValid()) {
                return res.json({ status: 'error', message: 'ngày không hợp lệ, vui lòng nhập đúng định dạng yyyy-mm-dd' });
            }
        }

        let missingFields = [];
        if (!session.amount) missingFields.push('số tiền');
        if (!session.description) missingFields.push('mô tả');
        if (!session.date) missingFields.push('ngày');

        if (missingFields.length > 0) {
            return res.json({ status: 'pending', message: `bạn chưa nhập đủ thông tin, hãy bổ sung: ${missingFields.join(', ')}` });
        }

        const cleanedDescription = session.description.replace(/\\/g, '');
        const newIncome = new Income({
            userId, 
            amount: session.amount, 
            description: cleanedDescription, 
            date: session.date
        });

        await newIncome.save(); 
        delete userSessions[userId];
        return res.json({ status: 'success', message: 'Thu nhập đã được lưu 🎉', data: newIncome });

    } catch (error) {
        console.error('lỗi hệ thống:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
