// =================================================================
// إعدادات النظام - معالجة ملفات الطلاب والإدارة (نسخة مُحدثة: إنشاء تلقائي للورقة)
// =================================================================

// 1. معالجة ملف الإكسل المرفوع (نظام نور)
function processUploadedStudentFile(base64Data, filename) {
  try {
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), MimeType.MICROSOFT_EXCEL, filename);
    const config = { title: "Temp_Upload_" + new Date().getTime(), mimeType: MimeType.GOOGLE_SHEETS };
    const file = Drive.Files.insert(config, blob, {convert: true});
    const tempSS = SpreadsheetApp.openById(file.id);
    
    // --- قراءة الشيت الأول: تحديد المرحلة ---
    const sheet1 = tempSS.getSheets()[0];
    const headerData = sheet1.getRange("A1:E10").getValues();
    let rawText = headerData.map(r => r.join(' ')).join(' ');
    
    let detectedStage = 'متوسط'; // الافتراضي
    if (rawText.includes('1') && rawText.includes('ابتدائي')) detectedStage = 'ابتدائي';
    else if (rawText.includes('2') && rawText.includes('متوسط')) detectedStage = 'متوسط';
    else if (rawText.includes('3') && rawText.includes('ثانوي')) detectedStage = 'ثانوي';
    else if (rawText.includes('ثانوية') || rawText.includes('الثانوية')) detectedStage = 'ثانوي';

    // --- قراءة الشيت الثاني: بيانات الطلاب ---
    const sheet2 = tempSS.getSheets()[1];
    if (!sheet2) throw new Error("الملف لا يحتوي على ورقة ثانية للطلاب");
    const rows = sheet2.getDataRange().getValues();
    
    let studentsToAdd = [];
    const classMap = { 1:'أ', 2:'ب', 3:'ج', 4:'د', 5:'هـ', 6:'و' };
    const gradeMap = { '0725': 'أول متوسط', '0825': 'ثاني متوسط', '0925': 'ثالث متوسط' };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const studentId = row[5]; 
      if (!studentId || isNaN(studentId) || String(studentId).length < 5) continue;

      const name = String(row[4]).trim();
      let rawGrade = row[3];
      let grade = gradeMap[rawGrade] || rawGrade;
      if (rawGrade == '0725' || rawGrade == '0825' || rawGrade == '0925') detectedStage = 'متوسط';
      
      let className = classMap[row[2]] || row[2];
      let mobile = String(row[1]).replace(/\D/g, '');
      if (mobile.startsWith('05')) mobile = '966' + mobile.substring(1);
      
      studentsToAdd.push([studentId, name, grade, className, mobile, detectedStage]);
    }

    // --- الحفظ في قاعدة البيانات الرئيسية (مع الإنشاء التلقائي) ---
    const mainSS = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let mainSheet = mainSS.getSheetByName(STUDENTS_SHEET_NAME);

    // 🔥 التعديل هنا: إذا لم يجد الورقة، يقوم بإنشائها وإضافة العناوين
    if (!mainSheet) {
      mainSheet = mainSS.insertSheet(STUDENTS_SHEET_NAME);
      mainSheet.appendRow(['رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 'رقم الجوال', 'المرحلة']);
      mainSheet.setRightToLeft(true); // جعل الاتجاه من اليمين لليسار
    }
    
    const existingData = mainSheet.getDataRange().getValues();
    let existingMap = new Map();
    existingData.forEach((r, idx) => { if(idx > 0) existingMap.set(String(r[0]), idx + 1); });

    studentsToAdd.forEach(student => {
       const id = String(student[0]);
       if (existingMap.has(id)) {
           const rowIndex = existingMap.get(id);
           mainSheet.getRange(rowIndex, 1, 1, 6).setValues([student]);
       } else {
           mainSheet.appendRow(student);
       }
    });

    Drive.Files.remove(file.id);

    return { 
        success: true, 
        message: `تمت المعالجة بنجاح.\nالمرحلة: ${detectedStage}\nتم تحديث/إضافة ${studentsToAdd.length} طالب.` 
    };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ... بقية دوال الإضافة والحذف اليدوي كما هي ...
function addStudentManually(data) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    
    // 🔥 إضافة الإنشاء التلقائي هنا أيضاً للأمان
    if (!sheet) {
      sheet = ss.insertSheet(STUDENTS_SHEET_NAME);
      sheet.appendRow(['رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 'رقم الجوال', 'المرحلة']);
      sheet.setRightToLeft(true);
    }
    
    const ids = sheet.getRange("A:A").getValues().flat();
    if (ids.includes(data.id)) throw new Error("رقم الطالب (الهوية) موجود مسبقاً");
    
    let mobile = data.mobile || '';
    if (mobile.startsWith('05')) mobile = '966' + mobile.substring(1);

    sheet.appendRow([data.id, data.name, data.grade, data.class, mobile, data.stage]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function deleteStudent(id) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    if (!sheet) throw new Error("ورقة الطلاب غير موجودة"); // هنا يجب أن تكون موجودة للحذف
    
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) == String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    throw new Error("الطالب غير موجود");
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function forcePermissionTrigger() {
  // هذا السطر لا يفعل شيئاً سوى إجبار جوجل على طلب الإذن
  Drive.Files.list(); 
  console.log("تم تفعيل الصلاحيات بنجاح!");
}