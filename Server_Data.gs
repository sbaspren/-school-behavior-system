// =================================================================
// DATA FETCHING - جلب البيانات (الإصدار الكامل والذكي)
// =================================================================

function getInitialData() {
  try {
    const students = getStudents_();
    const { violations, procedures } = getRulesData_();
    const settings = getSchoolSettings_();

    return { 
      success: true, 
      students, 
      violations, 
      procedures,
      settings,
      source: 'dynamic'
    };
  } catch (e) {
    console.log("❌ Error in getInitialData: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

// =================================================================
// HELPERS - دوال جلب الطلاب (مصححة لضبط القوائم المنسدلة)
// =================================================================
function getStudents_() {
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(STUDENTS_SHEET_NAME);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // سحب العناوين (الصف الأول) لتحديد أماكن الأعمدة بدقة
  const headers = data.shift(); 
  
  // إنشاء خريطة الفهارس (أين يقع كل عمود؟)
  const colMap = {
    id: headers.indexOf('رقم الطالب'),
    name: headers.indexOf('اسم الطالب'),
    grade: headers.indexOf('الصف'),
    class: headers.indexOf('الفصل'),
    mobile: headers.indexOf('رقم الجوال'),
    stage: headers.indexOf('المرحلة')
  };

  return data.map((row) => {
    // جلب البيانات بناءً على اسم العمود وليس رقمه
    let id = (colMap.id > -1) ? row[colMap.id] : "";
    let name = (colMap.name > -1) ? row[colMap.name] : "";
    let grade = (colMap.grade > -1) ? row[colMap.grade] : "";
    let cls = (colMap.class > -1) ? row[colMap.class] : "";
    let mobile = (colMap.mobile > -1) ? row[colMap.mobile] : "";
    let stage = (colMap.stage > -1) ? row[colMap.stage] : "";

    // تنظيف البيانات
    id = String(id).trim();
    name = String(name).trim();
    grade = String(grade).trim();
    cls = String(cls).trim();
    stage = String(stage).trim();

    // تجاهل الصفوف الفارغة
    if (!id || !name) return null;

    // إصلاح تلقائي للمرحلة
    if (!stage) {
        if (grade.includes('ثانوي')) stage = 'ثانوي';
        else if (grade.includes('متوسط')) stage = 'متوسط';
        else if (grade.includes('ابتدائي')) stage = 'ابتدائي';
    }

    return {
      'رقم الطالب': id,
      'اسم الطالب': name,
      'الصف': grade,
      'الفصل': cls,
      'رقم الجوال': mobile,
      'المرحلة': stage
    };
  }).filter(s => s !== null);
}

// دالة جلب إعدادات المدرسة
function getSchoolSettings_() {
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) return { manager: '', deputies: [], counselors: [], committee: [] };
  
  const data = sheet.getDataRange().getValues();
  data.shift();
  
  const settings = { manager: '', deputies: [], counselors: [], committee: [] };
  data.forEach(row => {
    const category = row[0] ? row[0].toString().trim() : '';
    const role = row[1] || '';
    const name = row[2] || '';
    
    if (category === 'إدارة') settings.manager = name;
    else if (category === 'وكلاء') settings.deputies.push({ role, name });
    else if (category === 'موجهين') settings.counselors.push({ role, name });
    else if (category === 'لجنة') settings.committee.push({ role, name });
  });
  return settings;
}

// قاعدة بيانات المخالفات والإجراءات (كاملة)
function getRulesData_() { 
  const violations = [
    { id: 101, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'التأخر الصباحي' },
    { id: 102, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'عدم حضور الاصطفاف الصباحي' },
    { id: 103, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'التأخر عن الاصطفاف أو العبث أثناءه' },
    { id: 104, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'التأخر في الدخول إلى الحصص' },
    { id: 105, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'إعاقة سير الحصص الدراسية' },
    { id: 106, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'النوم داخل الفصل' },
    { id: 107, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'تكرار الخروج والدخول من البوابة' },
    { id: 108, stage: 'متوسط وثانوي', type: 'حضوري', degree: 1, text: 'التجمهر أمام بوابة المدرسة' },
    { id: 201, stage: 'متوسط وثانوي', type: 'حضوري', degree: 2, text: 'عدم حضور الحصة أو الهروب منها' },
    { id: 202, stage: 'متوسط وثانوي', type: 'حضوري', degree: 2, text: 'الدخول أو الخروج من الفصل دون استئذان' },
    { id: 203, stage: 'متوسط وثانوي', type: 'حضوري', degree: 2, text: 'دخول فصل آخر دون استئذان' },
    { id: 204, stage: 'متوسط وثانوي', type: 'حضوري', degree: 2, text: 'إثارة الفوضى (فصل، مدرسة، نقل مدرسي)' },
    { id: 301, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'عدم التقيد بالزي المدرسي' },
    { id: 302, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'الشجار أو الاشتراك في مضاربة جماعية' },
    { id: 303, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'الإشارة بحركات مخلة بالأدب تجاه الطلبة' },
    { id: 304, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'التلفظ بكلمات نابية على الطلبة أو تهديدهم' },
    { id: 305, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'إلحاق الضرر المتعمد بممتلكات الطلبة' },
    { id: 306, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'العبث بتجهيزات المدرسة أو مبانيها' },
    { id: 307, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'إحضار المواد أو الألعاب الخطرة دون استخدامها' },
    { id: 308, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'حيازة السجائر بأنواعها' },
    { id: 309, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'حيازة المواد الإعلامية الممنوعة' },
    { id: 310, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'التوقيع عن ولي الأمر من غير علمه' },
    { id: 311, stage: 'متوسط وثانوي', type: 'حضوري', degree: 3, text: 'امتهان الكتب الدراسية' },
    { id: 401, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'تعمد إصابة أحد الطلبة (جرح، نزف، كسر)' },
    { id: 402, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'سرقة شيء من ممتلكات الطلبة أو المدرسة' },
    { id: 403, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'التصوير أو التسجيل الصوتي للطلبة' },
    { id: 404, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'إلحاق ضرر متعمد جسيم بتجهيزات المدرسة' },
    { id: 405, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'التدخين بأنواعه داخل المدرسة' },
    { id: 406, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'الهروب من المدرسة' },
    { id: 407, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'إحضار أو استخدام المواد أو الألعاب الخطرة' },
    { id: 408, stage: 'متوسط وثانوي', type: 'حضوري', degree: 4, text: 'عرض أو توزيع المواد الإعلامية الممنوعة' },
    { id: 501, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'الإساءة أو الاستهزاء بشيء من شعائر الإسلام' },
    { id: 502, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'الإساءة للدولة أو رموزها' },
    { id: 503, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'بث أو ترويج أفكار متطرفة أو إلحادية' },
    { id: 504, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'الإساءة للأديان السماوية أو إثارة العنصرية' },
    { id: 505, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'التزوير أو استخدام الأختام الرسمية' },
    { id: 506, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'التحرش الجنسي' },
    { id: 507, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'مظاهر أو شعارات الشذوذ الجنسي' },
    { id: 508, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'إشعال النار داخل المدرسة' },
    { id: 509, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'حيازة أو استخدام الأسلحة النارية أو الحادة' },
    { id: 510, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'حيازة أو تعاطي أو ترويج المخدرات والمسكرات' },
    { id: 511, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'الجرائم المعلوماتية بكافة أنواعها' },
    { id: 512, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'ابتزاز الطلبة' },
    { id: 513, stage: 'متوسط وثانوي', type: 'حضوري', degree: 5, text: 'التنمر بجميع أنواعه وأشكاله' },
    { id: 601, stage: 'متوسط وثانوي', type: 'رقمي', degree: 1, text: 'التأخر في حضور الحصة الافتراضية' },
    { id: 602, stage: 'متوسط وثانوي', type: 'رقمي', degree: 1, text: 'الخروج المتكرر من الحصص الافتراضية' },
    { id: 603, stage: 'متوسط وثانوي', type: 'رقمي', degree: 1, text: 'إعاقة سير الحصص الافتراضية' },
    { id: 604, stage: 'متوسط وثانوي', type: 'رقمي', degree: 2, text: 'الهروب من الحصة الافتراضية' },
    { id: 605, stage: 'متوسط وثانوي', type: 'رقمي', degree: 2, text: 'الإرسال المتعمد لمواد ليس لها علاقة بالمحتوى' },
    { id: 606, stage: 'متوسط وثانوي', type: 'رقمي', degree: 3, text: 'استخدام صور منافية للقيم والذوق العام' },
    { id: 607, stage: 'متوسط وثانوي', type: 'رقمي', degree: 3, text: 'التلفظ بكلمات نابية على الطلبة أو تهديدهم' },
    { id: 608, stage: 'متوسط وثانوي', type: 'رقمي', degree: 3, text: 'تصوير أو تسجيل الدروس الافتراضية ونشرها' },
    { id: 609, stage: 'متوسط وثانوي', type: 'رقمي', degree: 3, text: 'إساءة استخدام معلومات الدخول الشخصية' },
    { id: 610, stage: 'متوسط وثانوي', type: 'رقمي', degree: 4, text: 'إرسال صور أو مقاطع مخلة بالآداب للمعلمين أو الطلبة' },
    { id: 611, stage: 'متوسط وثانوي', type: 'رقمي', degree: 4, text: 'التصوير أو التسجيل الصوتي للمعلمين أو للطلبة' },
    { id: 612, stage: 'متوسط وثانوي', type: 'رقمي', degree: 5, text: 'التنمر الإلكتروني' },
    { id: 613, stage: 'متوسط وثانوي', type: 'رقمي', degree: 5, text: 'التحرش الجنسي الإلكتروني' },
    { id: 701, stage: 'متوسط وثانوي', type: 'هيئة تعليمية', degree: 4, text: 'تهديد المعلمين أو الإداريين' },
    { id: 702, stage: 'متوسط وثانوي', type: 'هيئة تعليمية', degree: 4, text: 'التلفظ بألفاظ غير لائقة تجاه المعلمين' },
    { id: 703, stage: 'متوسط وثانوي', type: 'هيئة تعليمية', degree: 5, text: 'الاعتداء بالضرب على المعلمين أو الإداريين' },
    { id: 704, stage: 'متوسط وثانوي', type: 'هيئة تعليمية', degree: 5, text: 'ابتزاز المعلمين أو الإداريين' },
    { id: 705, stage: 'متوسط وثانوي', type: 'هيئة تعليمية', degree: 5, text: 'الجرائم المعلوماتية تجاه المعلمين' }
  ];

  const procedures = {
    "101": { 
        "1": [{text:"- التنبيه الشفهي الأول من المعلم أو إدارة المدرسة"}], 
        "2": [{text:"- التنبيه الشفهي الثاني من المعلم أو إدارة المدرسة"}, {text:"- ملاحظة الطالب وحصر سلوكياته"}], 
        "3": [{text:"- تدوين المشكلة من المعلم"}, {text:"- أخذ توقيع الطالب عليها"}, {text:"- إشعار ولي الأمر هاتفيًا", formName: "إشعار ولي الأمر"}, {text:"- حسم درجة واحدة"}, {text:"- تمكين الطالب من فرص التعويض", formName: "فرص تعويض"}, {text:"- تحويل الطالب للموجه الطلابي", formName: "إحالة طالب"}], 
        "4": [{text:"- دعوة ولي أمر الطالب", formName: "دعوة ولي الأمر"}, {text:"- الاتفاق على خطة لتعديل السلوك"}, {text:"- حسم درجة واحدة"}, {text:"- تمكين الطالب من فرص التعويض", formName: "فرص تعويض"}, {text:"- تحويل الطالب للجنة التوجيه الطلابي"}, {text:"- متابعة الموجه الطلابي للحالة"}] 
    },
    "201": { 
        "1": [{text:"- إشعار ولي الأمر هاتفيًا", formName: "إشعار ولي الأمر"}, {text:"- حسم درجتين"}, {text:"- تمكين من فرص التعويض", formName: "فرص تعويض"}, {text:"- أخذ تعهد خطي", formName: "تعهد سلوكي"}, {text:"- تحويل للموجه الطلابي", formName: "إحالة طالب"}], 
        "2": [{text:"- تنفيذ جميع ما ورد في الإجراء الأول"}, {text:"- دعوة ولي أمر الطالب حضوريًا", formName: "دعوة ولي الأمر"}, {text:"- وضع برنامج وقائي"}, {text:"- متابعة الحالة من الموجه"}], 
        "3": [{text:"- تنفيذ جميع ما ورد في الإجراء الثاني"}, {text:"- نقل الطالب إلى فصل آخر"}, {text:"- تحويل الطالب للجنة التوجيه"}],
        "4": [{text:"- دعوة ولي أمر الطالب", formName: "دعوة ولي الأمر"}, {text:"- تحويل الطالب للجنة التوجيه الطلابي"}]
    },
    "301": { 
        "1": [{text:"- دعوة ولي أمر الطالب وتوضيح الإجراءات", formName: "دعوة ولي الأمر"}, {text:"- وضع برنامج وقائي"}, {text:"- أخذ تعهد خطي وتوقيع ولي الأمر", formName: "تعهد سلوكي"}, {text:"- حسم 3 درجات"}, {text:"- تمكين من فرص التعويض", formName: "فرص تعويض"}, {text:"- إلزام الطالب بالاعتذار"}, {text:"- إلزام الطالب بإصلاح ما أتلفه"}, {text:"- مصادرة المواد الممنوعة"}, {text:"- تحويل للموجه الطلابي", formName: "إحالة طالب"}], 
        "2": [{text:"- تنفيذ جميع ما ورد في الإجراء الأول"}, {text:"- دعوة ولي أمر الطالب وإنذار الطالب كتابيًا بالنقل", formName: "دعوة ولي الأمر"}, {text:"- أخذ توقيع ولي الأمر بالعلم"}, {text:"- تحويل الحالة للجنة التوجيه"}, {text:"- نقل الطالب المخالف لفصل آخر"}, {text:"- متابعة الحالة من الموجه"}], 
        "3": [{text:"- تنفيذ جميع ما ورد في الإجراء الأول"}, {text:"- رفع محضر لإدارة التعليم", formName: "محضر ضبط واقعة"}, {text:"- إصدار قرار بالنقل من مدير التعليم"}, {text:"- متابعة الحالة في المدرسة الجديدة"}] 
    },
    "401": { 
        "1": [{text:"- دعوة ولي أمر الطالب وإنذاره بالنقل", formName: "دعوة ولي الأمر"}, {text:"- أخذ تعهد خطي وتوقيع ولي الأمر", formName: "تعهد سلوكي"}, {text:"- حسم 10 درجات"}, {text:"- تمكين من فرص التعويض", formName: "فرص تعويض"}, {text:"- إلزام الطالب بالاعتذار"}, {text:"- إلزام الطالب بإصلاح ما أتلفه"}, {text:"- مصادرة المواد الممنوعة"}, {text:"- نقل الطالب لفصل آخر"}, {text:"- متابعة الحالة من الموجه"}], 
        "2": [{text:"- تنفيذ جميع ما ورد في الإجراء الأول (باستثناء نقل الفصل)"}, {text:"- رفع محضر لإدارة التعليم", formName: "محضر ضبط واقعة"}, {text:"- إصدار قرار بالنقل من مدير التعليم"}, {text:"- تمكين من فرص التعويض بالمدرسة الجديدة", formName: "فرص تعويض"}, {text:"- متابعة الحالة في المدرسة الجديدة"}] 
    },
    "501": { 
        "1": [{text:"- تدوين محضر من إدارة المدرسة", formName: "محضر ضبط واقعة"}, {text:"- دعوة ولي أمر الطالب وتبليغه", formName: "دعوة ولي الأمر"}, {text:"- حسم 15 درجة"}, {text:"- تمكين من فرص التعويض بالمدرسة الجديدة", formName: "فرص تعويض"}, {text:"- عقد اجتماع للجنة التوجيه", formName: "محضر اجتماع لجنة"}, {text:"- رفع محضر لإدارة التعليم"}, {text:"- إصدار قرار بالنقل من مدير التعليم"}, {text:"- متابعة الحالة في المدرسة الجديدة"}] 
    }
  };

  [102, 103, 104, 105, 106, 107, 108].forEach(id => procedures[id] = procedures["101"]);
  [202, 203, 204].forEach(id => procedures[id] = procedures["201"]);
  [302, 303, 304, 305, 306, 307, 308, 309, 310, 311].forEach(id => procedures[id] = procedures["301"]);
  [402, 403, 404, 405, 406, 407, 408].forEach(id => procedures[id] = procedures["401"]);
  [502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513].forEach(id => procedures[id] = procedures["501"]);
  
  procedures["601"] = procedures["101"];
  [602, 603].forEach(id => procedures[id] = procedures["601"]);
  [604, 605].forEach(id => procedures[id] = procedures["201"]);
  [606, 607, 608, 609].forEach(id => procedures[id] = procedures["301"]);
  [610, 611].forEach(id => procedures[id] = procedures["401"]);
  [612, 613].forEach(id => procedures[id] = procedures["501"]);
  
  [701, 702].forEach(id => procedures[id] = procedures["401"]);
  [703, 704, 705].forEach(id => procedures[id] = procedures["501"]);

  return { violations, procedures };
}