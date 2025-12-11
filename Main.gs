// =================================================================
// HTML SERVICE - خدمة عرض الصفحات
// =================================================================
function doGet() {
  // التغيير هنا: استخدام createTemplateFromFile بدلاً من createHtmlOutputFromFile
  // وإضافة .evaluate() في النهاية لتنفيذ أوامر الدمج
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('نظام المخالفات السلوكية الشامل')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// دالة الربط (كما هي)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}