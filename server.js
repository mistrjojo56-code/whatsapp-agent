// ============================================
// وسيط واتساب <-> Claude AI
// هذا السيرفر يستقبل رسائل واتساب، يرسلها لـ Claude
// للحصول على رد احترافي، ثم يرسل الرد رجوعًا للعميل
// ============================================

const express = require("express");
const app = express();
app.use(express.json());

// ---------- الإعدادات (من متغيرات البيئة) ----------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;         // كلمة سر تختارها أنت للتحقق من Meta
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;     // Access Token من Meta
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;   // Phone Number ID من Meta
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // مفتاح API الخاص بـ Claude

// System Prompt: هنا تحدد شخصية وأسلوب الرد الاحترافي
// عدّل هذا النص ليناسب نشاطك التجاري بالضبط
const SYSTEM_PROMPT = `أنت مساعد خدمة عملاء محترف جدًا ترد نيابة عن صاحب العمل.
- أسلوبك دائمًا مهذب، واضح، ومباشر
- ترد بلغة العميل (عربي أو فرنسي أو إنجليزي حسب رسالته)
- إذا كان السؤال يحتاج معلومة لا تملكها (سعر خاص، موعد دقيق، إلخ)، اطلب من العميل الانتظار قليلاً لأن "أحد الفريق سيتواصل معه قريبًا"
- لا تخترع معلومات أو أسعار أو مواعيد غير مؤكدة
- ردودك قصيرة ومركزة (2-4 جمل كحد أقصى) لأنها رسائل واتساب`;

// ---------- 1) التحقق من الـ Webhook (Meta تطلب هذا مرة واحدة عند الربط) ----------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ تم التحقق من الـ Webhook بنجاح");
    res.status(200).send(challenge);
  } else {
    console.log("❌ فشل التحقق - تأكد من VERIFY_TOKEN");
    res.sendStatus(403);
  }
});

// ---------- 2) استقبال الرسائل الواردة من واتساب ----------
app.post("/webhook", async (req, res) => {
  // نرد فورًا بـ 200 حتى لا يعيد Meta إرسال نفس الرسالة
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // نتجاهل إشعارات القراءة/الحالة، نهتم فقط برسائل نصية واردة فعليًا
    if (!message || message.type !== "text") return;

    const fromNumber = message.from;           // رقم العميل المرسل
    const userText = message.text.body;         // نص رسالة العميل

    console.log(`📩 رسالة واردة من ${fromNumber}: ${userText}`);

    // نطلب من Claude صياغة رد احترافي
    const reply = await getClaudeReply(userText);

    // نرسل الرد للعميل عبر واتساب
    await sendWhatsAppMessage(fromNumber, reply);

    console.log(`📤 تم إرسال الرد: ${reply}`);
  } catch (err) {
    console.error("خطأ أثناء معالجة الرسالة:", err);
  }
});

// ---------- دالة: إرسال النص لـ Claude والحصول على الرد ----------
async function getClaudeReply(userText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error("خطأ من Claude API:", data.error);
    return "عذرًا، حدث خلل مؤقت. سنتواصل معك قريبًا.";
  }

  const textBlock = data.content.find((c) => c.type === "text");
  return textBlock ? textBlock.text : "شكرًا لتواصلك معنا.";
}

// ---------- دالة: إرسال رسالة عبر WhatsApp Cloud API ----------
async function sendWhatsAppMessage(toNumber, text) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error("خطأ من WhatsApp API:", data.error);
  }
  return data;
}

// ---------- تشغيل السيرفر ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
