// =================================================================
// إعدادات خادم الواتساب (تم الربط بنجاح)
// =================================================================

// رابط السيرفر الخاص بك على Render
const WHATSAPP_SERVER_URL = "http://194.163.133.252:3000";
// 1. دالة فحص الحالة (هل متصل؟ هات الباركود)
function getWhatsAppStatus() {
  try {
    const response = UrlFetchApp.fetch(WHATSAPP_SERVER_URL + "/status", {
      muteHttpExceptions: true
    });
    return JSON.parse(response.getContentText());
  } catch (e) {
    // في حال كان السيرفر نائماً أو هناك خطأ
    return { connected: false, error: "السيرفر قيد التشغيل، حاول مرة أخرى..." };
  }
}

// 2. دالة إرسال الرسالة (تستخدم من أي مكان في النظام)
function sendWhatsAppMessage(phone, message) {
  try {
    // تنظيف الرقم (حذف الصفر في البداية وإضافة 966)
    let cleanPhone = phone.toString().replace(/\D/g, ''); // حذف الرموز
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    }
    
    const payload = {
      phone: cleanPhone,
      message: message
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WHATSAPP_SERVER_URL + "/send", options);
    return JSON.parse(response.getContentText());

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// 3. دالة "الوكزة" (لإيقاظ السيرفر وإبقائه حياً وقت الدوام)
function pingWhatsAppServer() {
  try {
    UrlFetchApp.fetch(WHATSAPP_SERVER_URL + "/", { muteHttpExceptions: true });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

// === دالة فحص الاتصال اليدوي ===
function TEST_CONNECTION_DEBUG() {
  Logger.log("جاري الاتصال بالسيرفر...");
  try {
    var result = getWhatsAppStatus();
    Logger.log("تم استلام الرد:");
    // طباعة أول 200 حرف فقط لتجنب تعليق النظام
    Logger.log(JSON.stringify(result).substring(0, 200)); 
  } catch (e) {
    Logger.log("خطأ في الاتصال: " + e.toString());
  }
}