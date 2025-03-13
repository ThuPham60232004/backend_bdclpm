import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const processTextWithGemini = async (req, res) => {
    try {
        const { extractedText } = req.body;
        if (!extractedText) {
            return res.status(400).json({ status: 'error', message: 'Không có văn bản hóa đơn được cung cấp' });
        }

        // **Prompt đầu tiên: Trích xuất thông tin hóa đơn**
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });
        const prompt1 = `
            Phân tích và trích xuất thông tin từ văn bản hóa đơn sau dưới dạng JSON:
            - Xác định danh mục chi tiêu phù hợp với danh sách dưới đây:
              1. Thực phẩm (Các mặt hàng liên quan đến thực phẩm) 🍽️
              2. Điện tử (Thiết bị và dụng cụ điện tử) 📱
              3. Dịch vụ (Các dịch vụ và tiện ích) 💼
              4. Thời trang (Quần áo và phụ kiện thời trang) 👗
              5. Vận chuyển (Dịch vụ vận chuyển và logistics) 🚚
              6. Khác (Các mặt hàng khác) ❓
              
            - Cung cấp mô tả về nội dung chi tiêu của hóa đơn trong mục "description".
            - Xác định và phân loại chính xác loại tiền tệ (VD: VND, USD, EUR, ...).
            - Chuẩn hóa ngày sang định dạng ISO (YYYY-MM-DD).
            - Trả về JSON với định dạng sau:
            {
              "storeName": "Tên cửa hàng",
              "totalAmount": "Tổng số tiền",
              "currency": "Loại tiền tệ",
              "date": "Ngày mua (ISO format)",
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

        const result1 = await model.generateContent([prompt1]);
        const response1 = await result1.response;
        let rawText = response1.text().trim().replace(/```json|```/g, '').trim();
        
        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch (jsonError) {
            console.error("Lỗi JSON:", jsonError);
            return res.status(500).json({ status: 'error', message: 'Lỗi xử lý JSON từ AI' });
        }

        let currency = parsedData.currency || "VND";
        let totalAmount = parseFloat(parsedData.totalAmount) || 0;

        if (currency !== "VND") {
            let exchangeRate = null;
            
            // 🟢 Thử lấy tỷ giá THB → VND
            const prompt2 = `Tìm tỷ giá mới nhất của 1 ${currency} sang VND. Chỉ trả về một số duy nhất.`;
            const result2 = await model.generateContent([prompt2]);
            const response2 = await result2.response;
            const exchangeRateText = response2.text().trim();
            
            // Nếu AI trả về số hợp lệ thì dùng
            exchangeRate = parseFloat(exchangeRateText);
            
            // 🔴 Nếu AI không tìm thấy, thử THB → USD rồi USD → VND
            if (isNaN(exchangeRate) || exchangeRate <= 0) {
                console.warn(`Không tìm thấy tỷ giá ${currency} → VND, thử chuyển đổi qua USD`);
                
                const prompt3 = `Tìm tỷ giá mới nhất của 1 ${currency} sang USD. Chỉ trả về một số duy nhất.`;
                const result3 = await model.generateContent([prompt3]);
                const response3 = await result3.response;
                const rateToUSD = parseFloat(response3.text().trim());
                
                const prompt4 = `Tìm tỷ giá mới nhất của 1 USD sang VND. Chỉ trả về một số duy nhất.`;
                const result4 = await model.generateContent([prompt4]);
                const response4 = await result4.response;
                const rateUSDToVND = parseFloat(response4.text().trim());
        
                if (!isNaN(rateToUSD) && rateToUSD > 0 && !isNaN(rateUSDToVND) && rateUSDToVND > 0) {
                    exchangeRate = rateToUSD * rateUSDToVND;
                }
            }
        
            // 🔴 Nếu vẫn lỗi, dùng tỷ giá fallback
            if (isNaN(exchangeRate) || exchangeRate <= 0) {
                console.error("Không thể lấy tỷ giá, dùng tỷ giá mặc định");
                exchangeRate = currency === "THB" ? 700 : null;
            }
        
            if (exchangeRate) {
                parsedData.exchangeRate = exchangeRate;
                parsedData.convertedAmount = (totalAmount * exchangeRate).toFixed(2);
                parsedData.currency = "VND";
            } else {
                return res.status(500).json({ status: 'error', message: `Không thể lấy tỷ giá cho ${currency}` });
            }
        }        

        // **Chuẩn hóa lại ngày tháng**
        parsedData.date = moment(parsedData.date, moment.ISO_8601, true).isValid()
            ? moment(parsedData.date).format('YYYY-MM-DD')
            : moment().format('YYYY-MM-DD');

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
