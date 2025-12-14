// =================================================================
// إعدادات النظام - معالجة ملفات الطلاب وإعدادات المدرسة
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

    // --- الحفظ في قاعدة البيانات الرئيسية ---
    const mainSS = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let mainSheet = mainSS.getSheetByName(STUDENTS_SHEET_NAME);

    if (!mainSheet) {
      mainSheet = mainSS.insertSheet(STUDENTS_SHEET_NAME);
      mainSheet.appendRow(['رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 'رقم الجوال', 'المرحلة']);
      mainSheet.setRightToLeft(true);
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

// إضافة طالب يدوياً
function addStudentManually(data) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    
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

// حذف طالب
function deleteStudent(id) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    if (!sheet) throw new Error("ورقة الطلاب غير موجودة");
    
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

// تفعيل الصلاحيات
function forcePermissionTrigger() {
  Drive.Files.list(); 
  console.log("تم تفعيل الصلاحيات بنجاح!");
}


// =================================================================
// 🆕 إعدادات المدرسة - School Settings
// يستخدم SCHOOL_SETTINGS_SHEET من Config.gs
// =================================================================

/**
 * جلب بيانات المدرسة
 */
function getSchoolSettings() {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(SCHOOL_SETTINGS_SHEET);
    
    // إذا لم يوجد الشيت، أنشئه مع القيم الافتراضية
    if (!sheet) {
      return createDefaultSchoolSettings_();
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createDefaultSchoolSettings_();
    }
    
    // تحويل البيانات لكائن
    const settings = {};
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      if (key) {
        if (key === 'stages' && value) {
          settings[key] = value.split(',').map(s => s.trim());
        } else {
          settings[key] = value || '';
        }
      }
    }
    
    return { success: true, data: settings };
    
  } catch (e) {
    console.error("❌ خطأ في جلب إعدادات المدرسة:", e);
    return { success: false, error: e.toString() };
  }
}

/**
 * حفظ بيانات المدرسة
 */
function saveSchoolSettings(settings) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(SCHOOL_SETTINGS_SHEET);
    
    // إنشاء الشيت إذا لم يكن موجوداً
    if (!sheet) {
      sheet = ss.insertSheet(SCHOOL_SETTINGS_SHEET);
      sheet.setRightToLeft(true);
      sheet.appendRow(['المفتاح', 'القيمة', 'الوصف', 'تاريخ التحديث']);
      sheet.getRange(1, 1, 1, 4).setBackground('#f3f4f6').setFontWeight('bold');
    }
    
    // تجهيز البيانات للحفظ
    const now = new Date();
    const dataToSave = [
      ['school_type', settings.school_type || '', 'نوع المدرسة', now],
      ['stages', Array.isArray(settings.stages) ? settings.stages.join(',') : settings.stages || '', 'المراحل الدراسية', now],
      ['region', settings.region || '', 'المنطقة التعليمية', now],
      ['education_dept', settings.education_dept || '', 'إدارة الشؤون التعليمية', now],
      ['school_name', settings.school_name || '', 'اسم المدرسة', now],
      ['principal_name', settings.principal_name || '', 'اسم مدير/ة المدرسة', now],
      ['logo_url', settings.logo_url || '', 'رابط شعار المدرسة', now],
      ['phone', settings.phone || '', 'هاتف المدرسة', now],
      ['email', settings.email || '', 'البريد الإلكتروني', now],
      ['address', settings.address || '', 'العنوان', now]
    ];
    
    // مسح البيانات القديمة (ما عدا العنوان)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clear();
    }
    
    // كتابة البيانات الجديدة
    if (dataToSave.length > 0) {
      sheet.getRange(2, 1, dataToSave.length, 4).setValues(dataToSave);
    }
    
    return { success: true, message: 'تم حفظ إعدادات المدرسة بنجاح' };
    
  } catch (e) {
    console.error("❌ خطأ في حفظ إعدادات المدرسة:", e);
    return { success: false, error: e.toString() };
  }
}

/**
 * إنشاء إعدادات افتراضية
 */
function createDefaultSchoolSettings_() {
  const defaultSettings = {
    school_type: 'بنين',
    stages: [],
    region: '',
    education_dept: 'بنين',
    school_name: '',
    principal_name: '',
    logo_url: 'https://i.ibb.co/5WxLGJPD/2025-11-15-233559.png',
    phone: '',
    email: '',
    address: ''
  };
  
  saveSchoolSettings(defaultSettings);
  
  return { success: true, data: defaultSettings };
}

/**
 * استرجاع الإعدادات الافتراضية
 */
function resetSchoolSettings() {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(SCHOOL_SETTINGS_SHEET);
    
    if (sheet) {
      ss.deleteSheet(sheet);
    }
    
    return createDefaultSchoolSettings_();
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * رفع شعار المدرسة
 */
function uploadSchoolLogo(base64Data, filename) {
  try {
    return { success: true, url: base64Data };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}