// ============================================
// وسيط واتساب <-> Claude AI (نسخة Vercel)
// نفس الفكرة السابقة، لكن معدّلة لتعمل على Vercel
// (بدون سيرفر دائم، بل "دالة" تُستدعى عند كل رسالة واردة)
// ============================================

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// System Prompt: عدّل هذا النص ليناسب نشاطك التجاري بالضبط
const SYSTEM_PROMPT = `أنت مساعد خدمة عملاء محترف جدًا ترد نيابة عن صاحب العمل.
- أسلوبك دائمًا مهذب، واضح، ومباشر
- ترد بلغة العميل (عربي أو فرنسي أو إنجليزي حسب رسالته)
- إذا كان السؤال يحتاج معلومة لا تملكها (سعر خاص، موعد دقيق، إلخ)، اطلب من العميل الانتظار قليلاً لأن "أحد الفريق سيتواصل معه قريبًا"
- لا تخترع معلومات أو أسعار أو مواعيد غير مؤكدة
- ردودك قصيرة ومركزة (2-4 جمل كحد أقصى) لأنها رسائل واتساب`;

// ---------- الدالة الرئيسية التي يستدعيها Vercel ----------
export default async function handler(req, res) {
  // 1) التحقق من الـ Webhook (Meta تطلب هذا مرة واحدة عند الربط)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ تم التحقق من الـ Webhook بنجاح");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ فشل التحقق - تأكد من VERIFY_TOKEN");
      return res.sendStatus(403);
    }
  }

  // 2) استقبال الرسائل الواردة من واتساب
  if (req.method === "POST") {
    // نرد فورًا حتى لا يعيد Meta إرسال نفس الرسالة
    res.status(200).send("OK");

    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message || message.type !== "text") return;

      const fromNumber = message.from;
      const userText = message.text.body;

      console.log(`📩 رسالة واردة من ${fromNumber}: ${userText}`);

      const reply = await getClaudeReply(userText);
      await sendWhatsAppMessage(fromNumber, reply);

      console.log(`📤 تم إرسال الرد: ${reply}`);
    } catch (err) {
      console.error("خطأ أثناء معالجة الرسالة:", err);
    }
    return;
  }

  return res.status(405).send("Method Not Allowed");
}

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
