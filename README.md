# وسيط واتساب + Claude AI — دليل التشغيل

هذا السيرفر الصغير يعمل كـ "موظف استقبال": يستقبل رسائل واتساب الواردة،
يرسلها لـ Claude ليصيغ ردًا احترافيًا، ثم يرسل الرد رجوعًا للعميل تلقائيًا.

## الملفات
- `server.js` — الكود الرئيسي (كل التعليقات بداخله بالعربية)
- `package.json` — قائمة المكتبات المطلوبة
- `.env.example` — نموذج لملف الإعدادات السرية

---

## خطوات التشغيل (بدون أي خبرة برمجية مسبقة)

### 1) احصل على مفتاح Claude API
1. اذهب إلى **console.anthropic.com**
2. سجّل حساب (إن لم يكن لديك)
3. من القائمة اذهب لـ **API Keys** → **Create Key**
4. انسخ المفتاح (يبدأ بـ `sk-ant-...`)

### 2) ارفع الكود على GitHub
1. أنشئ حساب على **github.com** إن لم يكن لديك
2. أنشئ مستودع (Repository) جديد باسم مثلاً `whatsapp-agent`
3. ارفع هذه الملفات الثلاثة إليه (`server.js`, `package.json`, `.env.example`)
   - لا ترفع ملف `.env` الحقيقي أبدًا، فقط `.env.example`

### 3) استضف السيرفر مجانًا على Render
1. اذهب إلى **render.com** وسجّل حساب (يمكن بحساب GitHub مباشرة)
2. اضغط **New +** → **Web Service**
3. اختر المستودع (Repository) الذي رفعته
4. الإعدادات:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. تحت قسم **Environment Variables**، أضف المتغيرات الأربعة من ملف `.env.example`
   بالقيم الحقيقية:
   - `VERIFY_TOKEN` (اختر أنت كلمة عشوائية، مثلاً: `myAgent2026Secret`)
   - `WHATSAPP_TOKEN` (الـ Access Token من Meta)
   - `PHONE_NUMBER_ID` (رقم الـ ID من Meta)
   - `ANTHROPIC_API_KEY` (مفتاح Claude)
6. اضغط **Create Web Service** وانتظر حتى ينتهي النشر (Deploy)
7. بعد الانتهاء ستحصل على رابط مثل: `https://whatsapp-agent-xxxx.onrender.com`

### 4) اربط الرابط مع Meta (تفعيل الـ Webhook)
1. ارجع لصفحة **Meta for Developers** > تطبيقك > **WhatsApp** > **Configuration**
2. ابحث عن قسم **Webhook** واضغط **Edit**
3. **Callback URL:** الصق رابط Render مع إضافة `/webhook` في النهاية
   مثال: `https://whatsapp-agent-xxxx.onrender.com/webhook`
4. **Verify Token:** اكتب نفس القيمة التي وضعتها في `VERIFY_TOKEN`
5. اضغط **Verify and Save**
6. فعّل الاشتراك في حقل **messages** (Subscribe)

### 5) جرّب!
أرسل رسالة واتساب من هاتفك للرقم التجريبي، وسترى الرد الاحترافي يصلك تلقائيًا خلال ثوانٍ.

---

## تخصيص أسلوب الرد
افتح `server.js` وعدّل متغير `SYSTEM_PROMPT` في الأعلى — هنا تحدد:
- اسم نشاطك التجاري
- الأسلوب المطلوب
- ماذا يفعل الـ agent إذا لم يعرف الإجابة

## ملاحظات أمان مهمة
- لا تشارك `WHATSAPP_TOKEN` أو `ANTHROPIC_API_KEY` مع أي شخص
- الرقم التجريبي من Meta يعمل مع 5 أرقام مستلمين كحد أقصى فقط — للانتقال لرقم حقيقي غير محدود، اتبع "Étape 2. Configuration de la production" في نفس صفحة Meta
