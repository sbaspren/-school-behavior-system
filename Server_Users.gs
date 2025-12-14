// =================================================================
// إدارة المستخدمين والصلاحيات - Server Side
// =================================================================

/**
 * قائمة الصلاحيات المتاحة في النظام
 */
const AVAILABLE_PERMISSIONS = [
  { id: 'absence_add', name: 'تسجيل غياب', icon: 'event_busy' },
  { id: 'late_add', name: 'تسجيل تأخر', icon: 'schedule' },
  { id: 'violation_add', name: 'تسجيل مخالفة', icon: 'gavel' },
  { id: 'violation_edit', name: 'تعديل مخالفة', icon: 'edit' },
  { id: 'whatsapp_send', name: 'إرسال واتساب', icon: 'chat' },
  { id: 'print_reports', name: 'طباعة التقارير', icon: 'print' },
  { id: 'view_stats', name: 'عرض الإحصائيات', icon: 'bar_chart' },
  { id: 'settings_edit', name: 'تعديل الإعدادات', icon: 'settings' },
  { id: 'students_manage', name: 'إدارة الطلاب', icon: 'groups' },
  { id: 'users_manage', name: 'إدارة المستخدمين', icon: 'manage_accounts' }
];

/**
 * قائمة الأدوار المتاحة
 */
const AVAILABLE_ROLES = [
  'وكيل',
  'وكيل شؤون طلاب',
  'وكيل تعليمي',
  'موجه طلابي',
  'مرشد طلابي',
  'إداري',
  'حارس أمن',
  'مشرف',
  'معلم',
  'أخرى'
];

/**
 * جلب جميع المستخدمين
 */
function getUsers() {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(USERS_SHEET);
    
    // إذا لم يوجد الشيت، أنشئه
    if (!sheet) {
      createUsersSheet_();
      return { 
        success: true, 
        users: [],
        permissions: AVAILABLE_PERMISSIONS,
        roles: AVAILABLE_ROLES
      };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { 
        success: true, 
        users: [],
        permissions: AVAILABLE_PERMISSIONS,
        roles: AVAILABLE_ROLES
      };
    }
    
    // تحويل البيانات لمصفوفة كائنات
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // تخطي الصفوف الفارغة
      
      users.push({
        id: row[0],
        name: row[1],
        role: row[2],
        mobile: row[3],
        email: row[4] || '',
        permissions: row[5] ? row[5].split(',') : [],
        scope_type: row[6] || 'all', // all, stage, grade, class
        scope_value: row[7] || '',
        status: row[8] || 'active',
        created_at: row[9],
        updated_at: row[10]
      });
    }
    
    return { 
      success: true, 
      users: users,
      permissions: AVAILABLE_PERMISSIONS,
      roles: AVAILABLE_ROLES
    };
    
  } catch (e) {
    console.error("❌ خطأ في جلب المستخدمين:", e);
    return { success: false, error: e.toString() };
  }
}

/**
 * إضافة مستخدم جديد
 */
function addUser(userData) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    let sheet = ss.getSheetByName(USERS_SHEET);
    
    if (!sheet) {
      sheet = createUsersSheet_();
    }
    
    // التحقق من عدم تكرار رقم الجوال
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][3] === userData.mobile) {
        throw new Error("رقم الجوال مسجل مسبقاً");
      }
    }
    
    // إنشاء معرف فريد
    const id = 'USER_' + new Date().getTime();
    const now = new Date();
    
    // تحضير الصلاحيات
    const permissions = Array.isArray(userData.permissions) 
      ? userData.permissions.join(',') 
      : '';
    
    // إضافة الصف
    sheet.appendRow([
      id,
      userData.name,
      userData.role,
      userData.mobile,
      userData.email || '',
      permissions,
      userData.scope_type || 'all',
      userData.scope_value || '',
      'active',
      now,
      now
    ]);
    
    return { success: true, id: id, message: 'تم إضافة المستخدم بنجاح' };
    
  } catch (e) {
    console.error("❌ خطأ في إضافة المستخدم:", e);
    return { success: false, error: e.message || e.toString() };
  }
}

/**
 * تحديث بيانات مستخدم
 */
function updateUser(userData) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(USERS_SHEET);
    
    if (!sheet) {
      throw new Error("ورقة المستخدمين غير موجودة");
    }
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // البحث عن المستخدم
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userData.id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error("المستخدم غير موجود");
    }
    
    // تحضير الصلاحيات
    const permissions = Array.isArray(userData.permissions) 
      ? userData.permissions.join(',') 
      : '';
    
    // تحديث البيانات
    const now = new Date();
    sheet.getRange(rowIndex, 2, 1, 10).setValues([[
      userData.name,
      userData.role,
      userData.mobile,
      userData.email || '',
      permissions,
      userData.scope_type || 'all',
      userData.scope_value || '',
      userData.status || 'active',
      data[rowIndex - 1][9], // created_at (لا يتغير)
      now // updated_at
    ]]);
    
    return { success: true, message: 'تم تحديث بيانات المستخدم بنجاح' };
    
  } catch (e) {
    console.error("❌ خطأ في تحديث المستخدم:", e);
    return { success: false, error: e.message || e.toString() };
  }
}

/**
 * حذف مستخدم
 */
function deleteUser(userId) {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(USERS_SHEET);
    
    if (!sheet) {
      throw new Error("ورقة المستخدمين غير موجودة");
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'تم حذف المستخدم بنجاح' };
      }
    }
    
    throw new Error("المستخدم غير موجود");
    
  } catch (e) {
    console.error("❌ خطأ في حذف المستخدم:", e);
    return { success: false, error: e.message || e.toString() };
  }
}

/**
 * إنشاء ورقة المستخدمين
 */
function createUsersSheet_() {
  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  let sheet = ss.getSheetByName(USERS_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET);
    sheet.setRightToLeft(true);
    
    // العناوين
    const headers = [
      'المعرف',
      'الاسم',
      'الدور',
      'الجوال',
      'البريد الإلكتروني',
      'الصلاحيات',
      'نوع النطاق',
      'قيمة النطاق',
      'الحالة',
      'تاريخ الإنشاء',
      'تاريخ التحديث'
    ];
    
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f4f6').setFontWeight('bold');
    
    // تجميد الصف الأول
    sheet.setFrozenRows(1);
    
    // ضبط عرض الأعمدة
    sheet.setColumnWidth(1, 150); // المعرف
    sheet.setColumnWidth(2, 200); // الاسم
    sheet.setColumnWidth(3, 120); // الدور
    sheet.setColumnWidth(4, 120); // الجوال
    sheet.setColumnWidth(5, 180); // البريد
    sheet.setColumnWidth(6, 250); // الصلاحيات
  }
  
  return sheet;
}

/**
 * جلب الصفوف والفصول للنطاق
 */
function getScopeOptions() {
  try {
    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
    
    if (!sheet) {
      return { success: true, stages: [], grades: [], classes: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    const stages = new Set();
    const grades = new Set();
    const classes = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][5]) stages.add(data[i][5]); // المرحلة
      if (data[i][2]) grades.add(data[i][2]); // الصف
      if (data[i][3]) classes.add(data[i][3]); // الفصل
    }
    
    return {
      success: true,
      stages: Array.from(stages),
      grades: Array.from(grades),
      classes: Array.from(classes)
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}