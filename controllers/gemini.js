import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Category from '../models/categories.js'; 
import Income from '../models/income.js';
import moment from 'moment';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const processTextWithGemini = async (req, res) => {
    try {
        const { extractedText } = req.body;
        if (!extractedText) {
            return res.status(400).json({ status: 'error', message: 'Không có văn bản hóa đơn được cung cấp' });
        }
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
            Phân tích và trích xuất thông tin từ văn bản hóa đơn sau dưới dạng JSON:
            - Xác định danh mục chi tiêu phù hợp với danh sách dưới đây:
              1. Thực phẩm (Các mặt hàng liên quan đến thực phẩm) 🍽️
              2. Điện tử (Thiết bị và dụng cụ điện tử) 📱
              3. Dịch vụ (Các dịch vụ và tiện ích) 💼
              4. Thời trang (Quần áo và phụ kiện thời trang) 👗
              5. Vận chuyển (Dịch vụ vận chuyển và logistics) 🚚
              6. Khác (Các mặt hàng khác) ❓
              
            - Cung cấp mô tả về nội dung chi tiêu của hóa đơn trong mục "description".

            - Trả về JSON với định dạng sau:
            {
              "storeName": "Tên cửa hàng",
              "totalAmount": "Tổng số tiền",
              "date": "Ngày mua",
              "items": [
                { "name": "Tên sản phẩm", "quantity": "Số lượng", "price": "Giá" }
              ],
              "category": {
                "_id": "ID danh mục",
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
        const matchedCategory = await Category.findOne({ name: parsedData.category.name });

        if (matchedCategory) {
            parsedData.category = {
                _id: matchedCategory._id,
                name: matchedCategory.name,
                description: matchedCategory.description,
                icon: matchedCategory.icon
            };
        } else {
            parsedData.category = {
                _id: "678cf12ee729fb9da6737256",
                name: "Khác",
                description: "Các mặt hàng khác",
                icon: "category"
            };
        }
        const totalAmount = parsedData.totalAmount;
        const description = `Chi tiêu tổng cộng ${totalAmount} VND cho các mặt hàng trong danh mục ${parsedData.category.name}.`;
        parsedData.category.description = description;
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
            return res.status(400).json({ status: 'error', message: 'Thiếu thông tin tin nhắn hoặc userId' });
        }

        const userMessage = message.trim().toLowerCase(); 
        if (!userSessions[userId]) {
            userSessions[userId] = { amount: null, description: null, date: null, confirmed: false };
        }
        const session = userSessions[userId];
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const responses = [
            { keywords: ["chi tiêu", "đầu tư", "spending", "investment"], message: "Đây là một câu hỏi về tài chính. Bạn có thể cung cấp thêm thông tin để tôi hỗ trợ chi tiết hơn về chi tiêu hoặc đầu tư, ví dụ như bạn muốn tiết kiệm hay đầu tư vào lĩnh vực nào?" },
            { keywords: ["chào", "giới thiệu", "hello", "introduce","hi","helo","halo","xin chào"], message: "Chào bạn! Tôi là trợ lý tài chính của bạn. Tôi có thể giúp bạn quản lý chi tiêu, đầu tư, hoặc giải thích các khái niệm tài chính. Bạn cần giúp gì ngay bây giờ?" },
            { keywords: ["khái niệm", "định nghĩa", "concept", "definition"], message: "Bạn muốn tôi giải thích khái niệm nào trong tài chính? Ví dụ như tiết kiệm, đầu tư, tỷ lệ lạm phát hay một khái niệm khác. Hãy cho tôi biết!" },
            { keywords: ["lãi suất", "vay mượn", "interest rate", "loan"], message: "Lãi suất là một phần quan trọng trong các giao dịch tài chính. Bạn cần giải thích về lãi suất vay mượn hay lãi suất tiết kiệm?" },
            { keywords: ["tài sản", "nợ", "vốn", "chứng khoán", "assets", "debt", "capital", "stocks"], message: "Tài sản và nợ là các yếu tố quan trọng trong việc quản lý tài chính cá nhân. Bạn cần tìm hiểu về cách phân biệt tài sản và nợ hoặc cách đầu tư vào chứng khoán?" },
            { keywords: ["tiết kiệm", "quỹ hưu trí", "savings", "retirement fund"], message: "Tiết kiệm là một cách tốt để đảm bảo tài chính trong tương lai. Bạn muốn tìm hiểu về cách lập kế hoạch tiết kiệm hoặc tạo một quỹ hưu trí?" },
            { keywords: ["chứng khoán", "cổ phiếu", "quỹ đầu tư", "securities", "stocks", "investment funds"], message: "Chứng khoán và cổ phiếu là những lựa chọn đầu tư phổ biến. Bạn có muốn tôi giải thích cách thức hoạt động của thị trường chứng khoán và các quỹ đầu tư?" },
            { keywords: ["ngân sách", "chi phí", "tiết kiệm", "budget", "expenses", "savings"], message: "Lập ngân sách và quản lý chi phí là những kỹ năng quan trọng trong tài chính cá nhân. Bạn muốn tôi giúp bạn tạo một ngân sách tiết kiệm?" },
            { keywords: ["kế hoạch tài chính", "quản lý tài chính", "financial plan", "financial management"], message: "Kế hoạch tài chính giúp bạn xác định mục tiêu và lộ trình tài chính. Bạn muốn tôi giúp bạn xây dựng một kế hoạch tài chính cá nhân?" },
            { keywords: ["đầu tư bất động sản", "vàng", "crypto", "real estate investment", "gold", "cryptocurrency"], message: "Đầu tư vào bất động sản, vàng hay crypto (tiền điện tử) là những lựa chọn đầu tư hấp dẫn. Bạn muốn tìm hiểu về một trong những loại đầu tư này?" }
        ];

        for (let response of responses) {
            if (response.keywords.some(keyword => userMessage.includes(keyword))) {
                return res.json({ status: 'success', message: response.message });
            }
        }

        const prompt = `
        Bạn là một trợ lý tài chính. Hãy phân tích tin nhắn và trả về JSON với cấu trúc:
        {
          "amount": <số tiền dạng số>,
          "description": "<mô tả>",
          "date": "<yyyy-mm-dd hoặc yyyy-mm hoặc yyyy>"
        }  
        Nếu thiếu dữ liệu, hãy để giá trị là null.
        Tin nhắn: "${message}"
        Bên cạnh đó bạn có thể trả lời các câu hỏi liên quan đến tài chính như chi tiêu, đầu tư, hoặc những câu hỏi giao tiếp thông thường như chào hỏi, giới thiệu bản thân, hoặc giải thích các khái niệm.
        `;

        const result = await model.generateContent([prompt]);
        const response = await result.response;
        let rawText = response.text().trim();

        console.log("Mô hình AI trả về:", rawText);  

        rawText = rawText.replace(/```json|```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);  
        } catch (error) {
            console.error("Lỗi phân tích JSON:", response);
            console.error("Lỗi phân tích JSON:", error);
            console.error("Dữ liệu nhận được:", rawText); 
            return res.json({ status: 'pending', message: "Không thể phân tích tin nhắn. Vui lòng nhập lại." });
        }

        if (parsedData.amount) session.amount = Number(parsedData.amount);
        if (parsedData.description) session.description = parsedData.description.trim();
        if (parsedData.date) session.date = parsedData.date.trim();

        if (session.date) {
            if (/^\d{4}-\d{2}$/.test(session.date)) { 
                return res.json({ 
                    status: 'pending', 
                    message: `Bạn đã nhập tháng ${session.date.split('-')[1]}/${session.date.split('-')[0]}. Hãy nhập thêm ngày cụ thể (VD: 15/${session.date.split('-')[1]}/${session.date.split('-')[0]}).` 
                });
            }
            if (/^\d{4}$/.test(session.date)) {  
                return res.json({ 
                    status: 'pending', 
                    message: `Bạn đã nhập năm ${session.date}. Hãy nhập thêm tháng & ngày cụ thể (VD: 01/06/${session.date}).` 
                });
            }
            if (!moment(session.date, 'YYYY-MM-DD', true).isValid()) {
                return res.json({ status: 'error', message: "Ngày không hợp lệ. Vui lòng nhập đúng định dạng YYYY-MM-DD." });
            }
        }

        let missingFields = [];
        if (!session.amount) missingFields.push("số tiền");
        if (!session.description) missingFields.push("mô tả");
        if (!session.date) missingFields.push("ngày");

        if (missingFields.length > 0) {
            return res.json({
                status: 'pending',
                message: `Bạn chưa nhập đủ thông tin. Hãy bổ sung: ${missingFields.join(", ")}.`,
            });
        }

        if (!session.confirmed) {
            session.confirmed = true;
            return res.json({ 
                status: 'pending', 
                message: `Xác nhận lưu thu nhập: ${session.amount.toLocaleString()} VND - "${session.description}" vào ngày ${session.date}? (Xác nhận / Hủy bỏ)` 
            });
        }
        
        if (session.confirmed && ["xác nhận", "confirm", "yes", "Xác nhận"].map(keyword => keyword.toLowerCase()).includes(userMessage.trim().toLowerCase())) {
            const newIncome = new Income({ 
                userId, 
                amount: session.amount, 
                description: session.description, 
                date: session.date 
            });
            await newIncome.save();
            delete userSessions[userId];
            return res.json({ status: 'success', message: "Thu nhập đã được lưu! 🎉", data: newIncome });
        }
        
        if (session.confirmed && ["hủy bỏ", "cancel", "no"].includes(userMessage.trim().toLowerCase())) {
            delete userSessions[userId];
            return res.json({ status: 'success', message: "Đã hủy lưu thu nhập." });
        }
        
        return res.json({ status: 'pending', message: "Hãy xác nhận hoặc nhập thêm thông tin." });
        
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
