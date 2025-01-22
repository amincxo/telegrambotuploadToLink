const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// توکن ربات تلگرام
const token = '6340289197:AAHgxnr3S1oUctd9oaiNGvEdEE5_mAyUjw8';

// ایجاد ربات
const bot = new TelegramBot(token, { polling: true });

// ایجاد سرور Express
const app = express();
const port = 3000;

// تنظیمات Multer برای آپلود فایل
const uploadsDir = '/var/www/gr.vaxgame.top/uploads/';

// ایجاد پوشه uploads اگر وجود ندارد
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// مسیر برای آپلود فایل از طریق مرورگر
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // ایجاد لینک دانلود از سرور
    const fileUrl = `https://gr.vaxgame.top/download/${path.basename(filePath)}`;
    res.send(`فایل با موفقیت آپلود شد! لینک دانلود: ${fileUrl}`);

    // حذف فایل پس از ۱۲ ساعت
    setTimeout(() => {
        fs.unlinkSync(filePath);
        console.log(`فایل ${filePath} پس از ۱۲ ساعت حذف شد.`);
    }, 12 * 60 * 60 * 1000); // ۱۲ ساعت
});

// مسیر برای دانلود فایل
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // بررسی وجود فایل
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        res.status(404).send('فایل یافت نشد!');
    }
});

// شروع سرور
app.listen(port, '0.0.0.0', () => {
    console.log(`سرور در حال اجرا است در https://gr.vaxgame.top`);
});

// دستور /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! فایل خود را برای دریافت لینک دانلود ارسال کنید.');
});

// دستور /myid برای دریافت Chat ID
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Chat ID شما: ${chatId}`);
});

// دریافت فایل از کاربر و ذخیره روی سرور
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;

    try {
        // دریافت اطلاعات فایل از تلگرام
        const fileInfo = await bot.getFile(fileId);
        const filePath = fileInfo.file_path;
        const fileName = msg.document.file_name;

        // دانلود فایل از تلگرام و ذخیره روی سرور
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const response = await axios({
            url: fileUrl,
            responseType: 'stream',
        });

        const localFilePath = path.join(uploadsDir, fileName);
        const writer = fs.createWriteStream(localFilePath);

        response.data.pipe(writer);

        writer.on('finish', () => {
            // ارسال لینک دانلود از سرور
            const downloadUrl = `https://gr.vaxgame.top/download/${fileName}`;
            bot.sendMessage(chatId, `فایل شما با موفقیت آپلود شد! لینک دانلود: ${downloadUrl}`);

            // حذف فایل پس از ۱۲ ساعت
            setTimeout(() => {
                fs.unlinkSync(localFilePath);
                console.log(`فایل ${localFilePath} پس از ۱۲ ساعت حذف شد.`);
            }, 12 * 60 * 60 * 1000); // ۱۲ ساعت
        });

        writer.on('error', (err) => {
            console.error('خطا در ذخیره فایل:', err);
            bot.sendMessage(chatId, 'خطا در ذخیره فایل!');
        });
    } catch (err) {
        console.error('خطا در آپلود فایل:', err);
        bot.sendMessage(chatId, 'خطا در آپلود فایل!');
    }
});
