// =================================================================
// VIOLATION LOGIC - منطق المخالفات (النسخة النهائية المتوافقة)
// =================================================================

function calculateRepeatLevel(studentId, violationId) {
  try {
    const students = getStudents_();
    const student = students.find(s => s['رقم الطالب'] == studentId);
    if (!student) throw new Error("Student not found.");
    
    const logSheetName = student['المرحلة'] === 'متوسط' ? LOG_SHEET_INTERMEDIATE : LOG_SHEET_SECONDARY;
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(logSheetName);
    
    if (!sheet || sheet.getLastRow() < 2) return { success: true, repeatLevel: 1, previousProcedures: [] };

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    // البحث الديناميكي عن الأعمدة (الآن ستكون صحيحة مع الهيكل الجديد)
    const studentIdColIndex = headers.indexOf('رقم الطالب');
    const violationIdColIndex = headers.indexOf('رقم المخالفة');
    const proceduresColIndex = headers.indexOf('الإجراءات');

    const previousViolations = data.filter(row => row[studentIdColIndex] == studentId && row[violationIdColIndex] == violationId);
    
    let previousProcedures = [];
    if (previousViolations.length > 0) {
      const lastViolation = previousViolations[previousViolations.length - 1];
      previousProcedures = lastViolation[proceduresColIndex] ? lastViolation[proceduresColIndex].split('\n') : [];
    }

    return { success: true, repeatLevel: previousViolations.length + 1, previousProcedures };
  } catch (e) {
    console.log("Error in calculateRepeatLevel: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function getCachedViolationRecords(stage) {
  const cacheKey = `violations_${stage}_${new Date().toLocaleDateString('en-US')}`;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached != null) return JSON.parse(cached);
  
  const records = getViolationRecords(stage);
  if (records.length > 0) cache.put(cacheKey, JSON.stringify(records), 300);
  return records;
}

function getViolationRecords(stage) {
  try {
    const logSheetName = stage === 'متوسط' ? LOG_SHEET_INTERMEDIATE : LOG_SHEET_SECONDARY;
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(logSheetName);
    
    if (!sheet || sheet.getLastRow() < 2) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    return data.map(row => {
      let record = {};
      headers.forEach((header, index) => {
        if (row[index] && row[index] instanceof Date) {
          record[header] = row[index].toISOString();
        } else {
          record[header] = row[index] || '';
        }
      });
      return record;
    }).filter(record => record['رقم الطالب']); 

  } catch (e) {
    console.error("❌ Error fetching records:", e.toString());
    return []; 
  }
}

// =================================================================
// SAVING DATA - حفظ المخالفة (تم التعديل للهيكل الجديد 17 عمود)
// =================================================================
function saveViolation(data) {
  console.log("🔍 بدء حفظ المخالفة:", data);
  
  try {
    if (!data || !data.studentId || !data.violationId) throw new Error("بيانات غير مكتملة");
    
    const students = getStudents_();
    const rules = getRulesData_();
    const violations = rules.violations;
    
    // 1. استدعاء بيانات الطالب (الموثوقة)
    const student = students.find(s => s['رقم الطالب'] == data.studentId);
    if (!student) throw new Error("الطالب غير موجود: " + data.studentId);
    
    // 2. استدعاء بيانات المخالفة
    const violation = violations.find(v => v.id == data.violationId);
    if (!violation) throw new Error("المخالفة غير موجودة: " + data.violationId);
    
    // 3. تحديد الشيت
    const logSheetName = student['المرحلة'] === 'متوسط' ? LOG_SHEET_INTERMEDIATE : LOG_SHEET_SECONDARY;
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(logSheetName);
    
    // إنشاء الشيت بالعناوين الصحيحة إذا لم يكن موجوداً
    if (!sheet) {
        const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
        const newSheet = ss.insertSheet(logSheetName);
        newSheet.setRightToLeft(true);
        newSheet.appendRow([
            'رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 
            'رقم المخالفة', 'نص المخالفة', 'نوع المخالفة', 'الدرجة', 
            'التاريخ الهجري', 'التاريخ الميلادي', 'مستوى التكرار', 'الإجراءات', 
            'النقاط', 'ملاحظات', 'النماذج المحفوظة', 'المستخدم', 'وقت الإدخال'
        ]);
    } else if(sheet.getLastRow() < 1) {
        // إذا كان الشيت موجوداً ولكنه فارغ
        sheet.appendRow([
            'رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 
            'رقم المخالفة', 'نص المخالفة', 'نوع المخالفة', 'الدرجة', 
            'التاريخ الهجري', 'التاريخ الميلادي', 'مستوى التكرار', 'الإجراءات', 
            'النقاط', 'ملاحظات', 'النماذج المحفوظة', 'المستخدم', 'وقت الإدخال'
        ]);
    }
    
    // 4. بناء الصف الجديد (17 عمود - بدون RowId في البداية)
    const newRowData = [
      student['رقم الطالب'], // A
      student['اسم الطالب'], // B
      student['الصف'],       // C
      student['الفصل'],      // D
      violation.id,          // E
      violation.text,        // F
      violation.type,        // G
      violation.degree,      // H
      new Date().toLocaleDateString('ar-SA-u-ca-islamic', {day: '2-digit', month: '2-digit', year: 'numeric'}), // I
      new Date(),            // J
      data.repeatLevel || 1, // K
      Array.isArray(data.procedures) ? data.procedures.join('\n') : '', // L
      data.points || 0,      // M
      data.notes || '',      // N
      Array.isArray(data.forms) ? data.forms.join('\n') : '', // O
      Session.getActiveUser().getEmail(), // P
      new Date()             // Q
    ];
    
    // الحفظ
    const targetSheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(logSheetName);
    targetSheet.appendRow(newRowData);
        
    // مسح الكاش
    const cacheKey = `violations_${student['المرحلة']}_${new Date().toLocaleDateString('en-US')}`;
    CacheService.getScriptCache().remove(cacheKey);
    
    return { 
      success: true, 
      message: "تم حفظ المخالفة بنجاح!",
      studentName: student['اسم الطالب'],
      proceduresCount: Array.isArray(data.procedures) ? data.procedures.length : 0,
      violationText: violation.text
    };

  } catch (e) {
    console.error("❌ خطأ في حفظ المخالفة:", e.toString());
    return { success: false, error: e.message };
  }
}