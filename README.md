# نظام حجز المواعيد للموظفين - Employee Scheduling System

## الوصف / Description

نظام حجز المواعيد للموظفين هو تطبيق ويب متكامل مكتوب باللغة العربية لإدارة حجوزات المواعيد والمؤتمرات والاجتماعات في المؤسسات. يتيح للموظفين حجز مواعيد جديدة ويتطلب موافقة الإدارة عليها.

An employee scheduling system is a comprehensive Arabic web application for managing appointment bookings, conferences, and meetings in organizations. It allows employees to book new appointments and requires administrative approval.

## المميزات / Features

### للموظفين / For Employees
- ✅ حجز موعد جديد مع تحديد القسم والموقع
- ✅ تحديد التاريخ والوقت المطلوب
- ✅ إضافة وصف تفصيلي للموعد
- ✅ متابعة حالة المواعيد (في الانتظار، مقبول، مرفوض)
- ✅ عرض تفاصيل المواعيد المعتمدة

### للإدارة / For Administrators
- ✅ عرض جميع طلبات المواعيد
- ✅ تصفية المواعيد حسب الحالة
- ✅ قبول أو رفض المواعيد مع إضافة ملاحظات
- ✅ تحديد التاريخ والوقت النهائي للمواعيد المقبولة
- ✅ إضافة سبب الرفض عند الحاجة
- ✅ لوحة إحصائيات شاملة

### الحالات المتاحة / Available Statuses
- 🔄 **في الانتظار (Pending)**: المواعيد الجديدة التي تنتظر الموافقة
- ✅ **مقبول (Approved)**: المواعيد المعتمدة من الإدارة
- ❌ **مرفوض (Rejected)**: المواعيد المرفوضة مع سبب الرفض
- ✅ **مكتمل (Done)**: المواعيد التي تمت بنجاح
- ⏰ **فات (Missed)**: المواعيد التي فاتت موعدها

## التقنيات المستخدمة / Technologies Used

### Backend
- **Node.js** - بيئة تشغيل JavaScript
- **Express.js** - إطار عمل الويب
- **SQLite** - قاعدة البيانات
- **UUID** - إنشاء معرفات فريدة

### Frontend
- **HTML5** - هيكل الصفحة
- **CSS3** - التصميم والأنيميشن
- **JavaScript (ES6+)** - التفاعل والوظائف
- **Font Awesome** - الأيقونات
- **Google Fonts (Cairo)** - الخط العربي

## التثبيت والتشغيل / Installation & Setup

### المتطلبات / Prerequisites
- Node.js (الإصدار 14 أو أحدث)
- npm (مدير الحزم)

### خطوات التثبيت / Installation Steps

1. **استنساخ المشروع / Clone the project**
   ```bash
   git clone <repository-url>
   cd alaa-project
   ```

2. **تثبيت التبعيات / Install dependencies**
   ```bash
   npm install
   ```

3. **تشغيل الخادم / Start the server**
   ```bash
   npm start
   ```

4. **فتح التطبيق / Open the application**
   افتح المتصفح واذهب إلى: `http://localhost:5000`

### التطوير / Development
```bash
npm run dev
```

## هيكل المشروع / Project Structure

```
alaa-project/
├── index.js                 # الخادم الرئيسي / Main server
├── package.json            # إعدادات المشروع / Project configuration
├── scheduling.db           # قاعدة البيانات / Database (auto-generated)
├── public/
│   └── main/
│       ├── index.html      # الصفحة الرئيسية / Main page
│       ├── style.css       # التصميم / Styling
│       └── script.js       # الوظائف / Functionality
└── README.md              # التوثيق / Documentation
```

## API Endpoints

### الأقسام / Departments
- `GET /api/departments` - جلب جميع الأقسام

### المواقع / Locations
- `GET /api/locations` - جلب جميع المواقع

### المواعيد / Appointments
- `GET /api/appointments` - جلب جميع المواعيد
- `POST /api/appointments` - إنشاء موعد جديد
- `GET /api/appointments/status/:status` - جلب المواعيد حسب الحالة
- `PUT /api/appointments/:id/status` - تحديث حالة الموعد
- `GET /api/appointments/stats` - إحصائيات المواعيد

## قاعدة البيانات / Database Schema

### جدول الأقسام / Departments Table
```sql
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);
```

### جدول المواقع / Locations Table
```sql
CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER,
    description TEXT
);
```

### جدول المواعيد / Appointments Table
```sql
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    department_id INTEGER,
    location_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    requested_date TEXT,
    requested_time TEXT,
    approved_date TEXT,
    approved_time TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (location_id) REFERENCES locations (id)
);
```

## كيفية الاستخدام / How to Use

### للموظفين / For Employees
1. افتح التطبيق وانتقل إلى تبويب "حجز موعد جديد"
2. املأ النموذج بالمعلومات المطلوبة
3. اختر القسم والموقع المناسب
4. حدد التاريخ والوقت المطلوب
5. أضف وصفاً للموعد (اختياري)
6. اضغط "إرسال الطلب"

### للإدارة / For Administrators
1. انتقل إلى تبويب "لوحة الإدارة"
2. استخدم الفلاتر لعرض المواعيد حسب الحالة
3. اضغط "تحديث الحالة" لأي موعد
4. اختر الحالة الجديدة وأضف الملاحظات
5. للمواعيد المقبولة، حدد التاريخ والوقت النهائي
6. للمواعيد المرفوضة، أضف سبب الرفض

## المميزات التقنية / Technical Features

- **تصميم متجاوب / Responsive Design**: يعمل على جميع الأجهزة
- **واجهة عربية / Arabic Interface**: تصميم مخصص للغة العربية
- **قاعدة بيانات SQLite / SQLite Database**: خفيفة وسريعة
- **API RESTful / RESTful API**: واجهة برمجة قياسية
- **إدارة الحالة / State Management**: تحديث فوري للبيانات
- **تحقق من المدخلات / Input Validation**: حماية من الأخطاء
- **رسائل تأكيد / Confirmation Messages**: تغذية راجعة للمستخدم

## المساهمة / Contributing

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:
We welcome contributions! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## الترخيص / License

هذا المشروع مرخص تحت رخصة MIT.
This project is licensed under the MIT License.

## الدعم / Support

إذا واجهت أي مشاكل أو لديك أسئلة، يرجى فتح issue في GitHub.
If you encounter any issues or have questions, please open an issue on GitHub.

---

**تم التطوير بواسطة / Developed by**: [Your Name]
**الإصدار / Version**: 1.0.0
**تاريخ الإصدار / Release Date**: 2024 
