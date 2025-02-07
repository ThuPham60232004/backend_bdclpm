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
const userSessions = {}; // Lưu thông tin tạm thời của người dùng

export const handleIncomeCommand = async (req, res) => {
    try {
        const { message, userId } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ status: 'error', message: 'Thiếu thông tin tin nhắn hoặc userId' });
        }

        const userMessage = message.trim().toLowerCase(); // Chuyển về chữ thường và loại bỏ khoảng trắng

        // Khởi tạo session nếu chưa có
        if (!userSessions[userId]) {
            userSessions[userId] = { amount: null, description: null, date: null, confirmed: false };
        }
        const session = userSessions[userId];

        // Dùng AI phân tích tin nhắn để trích xuất dữ liệu
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
        Bạn là một trợ lý tài chính. Hãy phân tích tin nhắn và trả về JSON với cấu trúc:
        {
          "amount": <số tiền dạng số>,
          "description": "<mô tả>",
          "date": "<yyyy-mm-dd hoặc yyyy-mm hoặc yyyy>"
        }  
        Nếu thiếu dữ liệu, hãy để giá trị là null.
        Tin nhắn: "${message}"
        `;
        const result = await model.generateContent([prompt]);
        const response = await result.response;
        let rawText = response.text().trim();

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch {
            return res.json({ status: 'pending', message: "Không thể phân tích tin nhắn. Vui lòng nhập lại." });
        }

        // Chuẩn hóa dữ liệu đầu vào
        if (parsedData.amount) session.amount = Number(parsedData.amount);
        if (parsedData.description) session.description = parsedData.description.trim();
        if (parsedData.date) session.date = parsedData.date.trim();

        // Xử lý nhập thiếu ngày/tháng/năm và chuyển sang ISO 8601
        if (session.date) {
            if (/^\d{4}-\d{2}$/.test(session.date)) {  // Nếu chỉ nhập tháng-năm
                return res.json({ 
                    status: 'pending', 
                    message: `Bạn đã nhập tháng ${session.date.split('-')[1]}/${session.date.split('-')[0]}. Hãy nhập thêm ngày cụ thể (VD: 15/${session.date.split('-')[1]}/${session.date.split('-')[0]}).` 
                });
            }
            if (/^\d{4}$/.test(session.date)) {  // Nếu chỉ nhập năm
                return res.json({ 
                    status: 'pending', 
                    message: `Bạn đã nhập năm ${session.date}. Hãy nhập thêm tháng & ngày cụ thể (VD: 01/06/${session.date}).` 
                });
            }

            // Kiểm tra nếu ngày có đúng định dạng ISO 8601 (YYYY-MM-DD)
            if (!moment(session.date, 'YYYY-MM-DD', true).isValid()) {
                return res.json({ status: 'error', message: "Ngày không hợp lệ. Vui lòng nhập đúng định dạng YYYY-MM-DD." });
            }
        }

        // Kiểm tra thông tin còn thiếu
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

        // Hiển thị bản xác nhận
        if (!session.confirmed) {
            session.confirmed = true;
            return res.json({ 
                status: 'pending', 
                message: `Xác nhận lưu thu nhập: ${session.amount.toLocaleString()} VND - "${session.description}" vào ngày ${session.date}? (Có / Không)`
            });
        }

        // Nếu người dùng xác nhận "Có" → Lưu vào MongoDB
        if (session.confirmed && ["có", "yes","CÓ","CO","co","Co","cO"].includes(userMessage)) {
            const newIncome = new Income({ 
                userId, 
                amount: session.amount, 
                description: session.description, 
                date: session.date // Định dạng chuẩn ISO 8601
            });
            await newIncome.save();
            delete userSessions[userId];
            return res.json({ status: 'success', message: "Thu nhập đã được lưu! 🎉", data: newIncome });
        }

        // Nếu người dùng hủy lưu
        if (session.confirmed && ["không", "no"].includes(userMessage)) {
            delete userSessions[userId];
            return res.json({ status: 'success', message: "Đã hủy lưu thu nhập." });
        }

        return res.json({ status: 'pending', message: "Hãy xác nhận hoặc nhập thêm thông tin." });

    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};