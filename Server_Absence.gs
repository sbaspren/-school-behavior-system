// =================================================================
// ABSENCE LOGIC - معالجة الغياب (النسخة الذكية: الكل موجود + التحديث التراكمي)
// =================================================================

// 1. معالجة ملف نور وحفظ البيانات (Zero-Based Strategy)
// استبدل دالة processNoorAbsenceFile القديمة بهذه الدالة بالكامل
function processNoorAbsenceFile(fileContent) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    
    // 1. القائمة الذهبية: جلب جميع الطلاب وتحديد مراحلهم من الإعدادات
    const studentsSheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    if (!studentsSheet) throw new Error("سجل الطلاب الرسمي غير موجود.");
    const studentsData = studentsSheet.getDataRange().getValues();
    
    // خريطة لتخزين بيانات كل طالب (المفتاح: الاسم المنظف)
    let masterMap = new Map();

    // تخطي العنوان وبناء القائمة الأساسية
    for (let i = 1; i < studentsData.length; i++) {
      let row = studentsData[i];
      let name = normalizeName_(row[1]);
      if(!name) continue;
      
      masterMap.set(name, {
        id: String(row[0]).trim(),
        name: row[1],
        grade: row[2],
        class: row[3],
        stage: row[5], // هام جداً لفرز الثانوي عن المتوسط
        excused: 0,
        unexcused: 0,
        late: 0,
        updated: new Date()
      });
    }

    // 2. الحفاظ على القديم: قراءة السجلات الحالية (متوسط وثانوي) لعدم تصفير الغائبين عن الملف الحالي
    const sheetsToRead = ["سجل_الغياب_متوسط", "سجل_الغياب_ثانوي"];
    sheetsToRead.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        const data = sheet.getDataRange().getValues();
        // نفترض ترتيب الأعمدة: A=id, B=name, ..., E=excused(4), F=unexcused(5), G=late(6)
        for (let i = 1; i < data.length; i++) {
          let name = normalizeName_(data[i][1]);
          if (masterMap.has(name)) {
            let s = masterMap.get(name);
            // نحتفظ بالقديم كقيمة مبدئية (لا نصفر العدادات)
            s.excused = Number(data[i][4]) || 0;
            s.unexcused = Number(data[i][5]) || 0;
            s.late = Number(data[i][6]) || 0;
          }
        }
      }
    });

    // 3. التحديث الذكي: قراءة ملف نور وتحديث الموجودين فيه فقط (استبدال القديم بالجديد التراكمي)
    let rows = Utilities.parseCsv(fileContent);
    if (rows.length > 0 && rows[0].length < 5) rows = Utilities.parseCsv(fileContent, ';');
    
    let stats = { updated: 0 };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawName = row[9] ? row[9].toString().trim() : ''; 
      if (!rawName || rawName.includes('الاســـم')) continue;

      const cleanName = normalizeName_(rawName);
      
      // إذا الطالب موجود في القائمة الذهبية، نحدث بياناته بالأرقام الجديدة التراكمية من الملف
      if (masterMap.has(cleanName)) {
        let s = masterMap.get(cleanName);
        s.late = parseInt(row[0]) || 0;
        s.unexcused = parseInt(row[1]) || 0;
        s.excused = parseInt(row[2]) || 0;
        s.updated = new Date(); // تحديث تاريخ التعديل لهذا الطالب فقط
        stats.updated++;
      }
    }

    // 4. الفرز والحفظ: توزيع الطلاب حسب مرحلتهم المسجلة في الإعدادات
    let listInt = new Map();
    let listSec = new Map();

    masterMap.forEach((s, key) => {
      // فرز الثانوي عن المتوسط بناءً على العمود المحفوظ من الإعدادات
      if ((s.stage && s.stage.includes('ثانوي')) || (s.grade && s.grade.includes('ثانوي'))) {
        listSec.set(key, s);
      } else {
        listInt.set(key, s); // الافتراضي متوسط
      }
    });

    // حفظ القوائم (التي تحتوي الآن على القديم الثابت + الجديد المحدث)
    saveToSheet_(ss, "سجل_الغياب_متوسط", listInt);
    saveToSheet_(ss, "سجل_الغياب_ثانوي", listSec);

    return { 
      success: true, 
      message: `تمت المعالجة بنجاح:\n- تم تحديث بيانات: ${stats.updated} طالب (من الملف المرفوع).\n- تم الحفاظ على بيانات باقي الطلاب (${masterMap.size - stats.updated}) كما هي.` 
    };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// دالة مساعدة للحفظ (تمسح وتكتب)
function saveToSheet_(ss, sheetName, dataMap) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.setRightToLeft(true);
    }
    
    // مسح البيانات القديمة (ما عدا الرأسية إن أردت، لكن هنا سنعيد كتابتها للأمان)
    sheet.clear();
    
    const headers = ['رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 'غياب بعذر', 'غياب بدون عذر', 'تأخير', 'آخر تحديث'];
    sheet.appendRow(headers);
    
    // تحويل الـ Map إلى مصفوفة للكتابة السريعة
    let rowsToWrite = [];
    dataMap.forEach(student => {
        rowsToWrite.push([
            student.id,
            student.name,
            student.grade,
            student.class,
            student.excused,
            student.unexcused,
            student.late,
            student.updated
        ]);
    });

    if (rowsToWrite.length > 0) {
        sheet.getRange(2, 1, rowsToWrite.length, 8).setValues(rowsToWrite);
        // تنسيق بسيط
        sheet.getRange(1, 1, 1, 8).setBackground('#f3f4f6').setFontWeight('bold');
    }
}

// 2. دالة جلب البيانات للواجهة (لم نغير هيكلها لكي لا تخرب الواجهة)
function getAbsenceDashboardData() {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let allData = [];
    
    const readSheet = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      
      // الترتيب: A=الهوية, B=الاسم, C=الصف, D=الفصل, E=بعذر, F=بدون, G=تأخير
      for(let i=1; i<data.length; i++) {
        allData.push({
          id: data[i][0], 
          name: data[i][1], 
          grade: data[i][2], 
          class: data[i][3],
          excused: Number(data[i][4]) || 0, 
          unexcused: Number(data[i][5]) || 0, 
          late: Number(data[i][6]) || 0,
          lastUpdate: data[i][7] ? String(data[i][7]) : ''
        });
      }
    };

    readSheet("سجل_الغياب_متوسط");
    readSheet("سجل_الغياب_ثانوي");
    
    return allData;

  } catch (e) {
    throw new Error("فشل جلب البيانات: " + e.toString());
  }
}

// 3. التعديل اليدوي (يعتمد على الهوية)
function updateStudentAbsence(data) {
  try {
    if (!data || !data.id) throw new Error("بيانات غير مكتملة");
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    
    // البحث عن الطالب في الشيتين
    let targetSheet = null;
    let rowIndex = -1;
    
    // دالة بحث سريع
    const findInSheet = (name) => {
        const s = ss.getSheetByName(name);
        if(!s) return false;
        // قراءة عمود الهوية (A)
        const ids = s.getRange("A:A").getValues().flat().map(String);
        const idx = ids.indexOf(String(data.id));
        if (idx > 0) { // تجاوز العنوان
            targetSheet = s;
            rowIndex = idx + 1;
            return true;
        }
        return false;
    };

    if (!findInSheet("سجل_الغياب_متوسط")) {
        findInSheet("سجل_الغياب_ثانوي");
    }

    if (!targetSheet) throw new Error("لم يتم العثور على الطالب");

    // التحديث (الأعمدة 5, 6, 7, 8)
    targetSheet.getRange(rowIndex, 5, 1, 4).setValues([[
        data.excused, 
        data.unexcused, 
        data.late, 
        new Date()
    ]]);

    return { success: true };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// دالة تنظيف الأسماء (نفس المستخدمة في الإعدادات)
function normalizeName_(name) {
  if (!name) return "";
  let n = String(name).trim();
  n = n.replace(/\s(بن|ابن)\s/g, ' '); 
  n = n.replace(/عبد\s+/g, 'عبد');
  n = n.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  n = n.replace(/\s+/g, ' ');
  return n;
}