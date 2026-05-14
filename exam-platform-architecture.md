# منصة امتحانات أ/ أحمد سرور — وثيقة المعمارية الكاملة

## نظرة عامة على المشروع

منصة امتحانات إلكترونية لمدرس رياضيات اسمه أحمد سرور، عنده موقع قائم على ahmed-srour.com. المنصة هتشتغل على exams.ahmed-srour.com. المنصة لها جانبين: لوحة تحكم للمدرس وواجهة امتحان للطالب. عدد الطلاب من 50 إلى 400 طالب.

**كل الواجهات والنصوص والأزرار بالعربي — الموقع كله RTL.**

---

## الألوان والثيم — مطابق لموقع ahmed-srour.com

```css
:root {
  --primary: #1a1a2e;        /* الأزرق الغامق — الخلفيات الرئيسية */
  --secondary: #16213e;      /* أزرق متوسط — البطاقات */
  --accent: #e94560;         /* الأحمر — الأزرار والعناصر المهمة */
  --accent-hover: #c81e45;   /* أحمر غامق — hover */
  --gold: #f5c518;           /* ذهبي — الإنجازات والنجوم */
  --text-primary: #ffffff;   /* أبيض — النصوص الرئيسية */
  --text-secondary: #b0b0b0; /* رمادي فاتح — النصوص الثانوية */
  --bg-dark: #0f0f23;        /* خلفية الصفحة */
  --bg-card: #1a1a2e;        /* خلفية البطاقات */
  --bg-input: #16213e;       /* خلفية الحقول */
  --border: #2a2a4a;         /* الحدود */
  --success: #00c853;        /* أخضر — إجابة صحيحة */
  --danger: #e94560;         /* أحمر — إجابة خاطئة */
  --warning: #f5c518;        /* أصفر — تحذيرات */
  font-family: 'Cairo', 'Segoe UI', sans-serif;
  direction: rtl;
}
```

---

## 1. Firebase Firestore Database Schema

### Collection: `teachers`

```
teachers/{teacherId}
├── email: string                    // "ahmed@ahmed-srour.com"
├── name: string                     // "أ/ أحمد سرور"
├── createdAt: timestamp
```

### Collection: `exams`

```
exams/{examId}
├── teacherId: string                // reference to teacher
├── title: string                    // "امتحان الباب الأول — تفاضل"
├── subject: string                  // "رياضيات"
├── grade: string                    // "الثالث الثانوي"
├── classCode: string                // "MATH3A" — الطالب يدخله عشان يوصل للامتحان
├── timeLimit: number                // بالدقائق — مثلا 45
├── mode: string                     // "fixed" أو "random"
├── status: string                   // "draft" | "active" | "closed"
├── openDate: timestamp              // تاريخ بداية الامتحان
├── closeDate: timestamp             // تاريخ نهاية الامتحان
├── totalMarks: number               // مجموع الدرجات
├── questionsCount: number           // عدد الأسئلة
├── createdAt: timestamp
├── updatedAt: timestamp
```

### Collection: `questions`

```
questions/{questionId}
├── examId: string                   // reference to exam
├── type: string                     // "mcq" أو "essay"
├── text: string                     // نص السؤال
├── imageUrl: string | null          // رابط صورة السؤال من Firebase Storage
├── marks: number                    // درجة السؤال
├── order: number                    // ترتيب السؤال في الامتحان
├── options: array (MCQ only)        // ["2x+1", "3x+2", "x+5", "4x-1"]
├── correctAnswer: number (MCQ only) // index الإجابة الصحيحة (0-3)
├── createdAt: timestamp
```

### Collection: `submissions`

```
submissions/{submissionId}
├── examId: string
├── studentName: string              // "محمد أحمد"
├── studentGrade: string             // "3ث"
├── classCode: string
├── answers: map                     // { questionId: { answer: string|number, isCorrect: boolean } }
├── mcqScore: number                 // درجة MCQ التلقائية
├── essayScore: number | null        // درجة المقالي — null لحد ما المدرس يصحح
├── totalScore: number | null        // المجموع الكلي
├── totalMarks: number               // الدرجة الكلية للامتحان
├── status: string                   // "submitted" | "graded"
├── timeTaken: number                // بالثواني
├── submittedAt: timestamp
├── gradedAt: timestamp | null
```

---

## 2. هيكل مجلدات المشروع (Next.js)

```
exams-platform/
├── .env.local                        # Firebase config keys
├── next.config.js
├── package.json
├── tailwind.config.js
├── public/
│   └── logo.png                      # شعار يلا نفهم math
│
├── src/
│   ├── app/
│   │   ├── layout.js                 # Root layout — Cairo font + RTL
│   │   ├── page.js                   # الصفحة الرئيسية — دخول الطالب بكود الامتحان
│   │   │
│   │   ├── exam/
│   │   │   ├── [classCode]/
│   │   │   │   ├── page.js           # صفحة إدخال بيانات الطالب
│   │   │   │   ├── start/
│   │   │   │   │   └── page.js       # صفحة الامتحان الفعلية
│   │   │   │   └── result/
│   │   │   │       └── page.js       # صفحة النتيجة بعد التسليم
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.js             # Layout لوحة التحكم — sidebar + header
│   │   │   ├── page.js               # الصفحة الرئيسية — إحصائيات عامة
│   │   │   ├── login/
│   │   │   │   └── page.js           # تسجيل دخول المدرس
│   │   │   ├── exams/
│   │   │   │   ├── page.js           # قائمة كل الامتحانات
│   │   │   │   ├── new/
│   │   │   │   │   └── page.js       # إنشاء امتحان جديد
│   │   │   │   └── [examId]/
│   │   │   │       ├── page.js       # تعديل الامتحان
│   │   │   │       ├── questions/
│   │   │   │       │   └── page.js   # إدارة أسئلة الامتحان
│   │   │   │       └── results/
│   │   │   │           └── page.js   # نتائج الطلاب في هذا الامتحان
│   │   │   └── results/
│   │   │       └── page.js           # كل النتائج — عرض عام
│   │
│   ├── components/
│   │   ├── ui/                       # مكونات عامة
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loading.jsx
│   │   │   └── Timer.jsx
│   │   │
│   │   ├── exam/                     # مكونات الامتحان (جانب الطالب)
│   │   │   ├── StudentEntryForm.jsx  # فورم إدخال اسم الطالب والصف
│   │   │   ├── MCQQuestion.jsx       # عرض سؤال اختيار من متعدد
│   │   │   ├── EssayQuestion.jsx     # عرض سؤال مقالي + صورة
│   │   │   ├── QuestionNav.jsx       # التنقل بين الأسئلة (نقاط مرقمة)
│   │   │   ├── ExamTimer.jsx         # مؤقت الامتحان
│   │   │   └── ResultCard.jsx        # بطاقة النتيجة
│   │   │
│   │   ├── dashboard/                # مكونات لوحة التحكم (جانب المدرس)
│   │   │   ├── Sidebar.jsx           # القائمة الجانبية
│   │   │   ├── Header.jsx            # الهيدر العلوي
│   │   │   ├── StatsCards.jsx        # بطاقات الإحصائيات
│   │   │   ├── ExamForm.jsx          # فورم إنشاء/تعديل امتحان
│   │   │   ├── QuestionForm.jsx      # فورم إضافة/تعديل سؤال
│   │   │   ├── MCQForm.jsx           # فورم سؤال اختيار من متعدد
│   │   │   ├── EssayForm.jsx         # فورم سؤال مقالي + رفع صورة
│   │   │   ├── ImageUploader.jsx     # رفع صور الأسئلة
│   │   │   ├── ResultsTable.jsx      # جدول نتائج الطلاب
│   │   │   ├── EssayGrader.jsx       # واجهة تصحيح المقالي
│   │   │   └── ExportButton.jsx      # زر تصدير Excel/CSV
│   │
│   ├── lib/
│   │   ├── firebase.js               # Firebase initialization
│   │   ├── auth.js                   # Firebase Auth helpers
│   │   ├── db.js                     # Firestore CRUD operations
│   │   ├── storage.js                # Firebase Storage upload/delete
│   │   ├── examUtils.js              # Randomization + scoring logic
│   │   └── exportUtils.js            # Excel/CSV export
│   │
│   ├── hooks/
│   │   ├── useAuth.js                # Authentication hook
│   │   ├── useExam.js                # Exam data hook
│   │   └── useTimer.js               # Timer countdown hook
│   │
│   └── styles/
│       └── globals.css               # Tailwind + custom CSS variables
```

---

## 3. وصف المكونات الرئيسية

### جانب الطالب

| المكون | المسؤولية |
|--------|-----------|
| `page.js` (الرئيسية) | الطالب يدخل كود الامتحان classCode |
| `StudentEntryForm` | الطالب يدخل اسمه والصف بعد ما يدخل الكود |
| `ExamTimer` | مؤقت يعد تنازلي — لما يوصل صفر يسلم تلقائي |
| `MCQQuestion` | يعرض سؤال MCQ مع 4 اختيارات — ضغطة واحدة تحدد الإجابة |
| `EssayQuestion` | يعرض السؤال + الصورة المرفقة + textarea للإجابة |
| `QuestionNav` | نقاط مرقمة — أخضر للمجاب، رمادي لغير المجاب |
| `ResultCard` | يعرض النتيجة: MCQ فوري، المقالي "في انتظار التصحيح" |

### جانب المدرس (Dashboard)

| المكون | المسؤولية |
|--------|-----------|
| `Sidebar` | قائمة جانبية: الرئيسية، الامتحانات، النتائج |
| `StatsCards` | إحصائيات: عدد الامتحانات، عدد الطلاب، متوسط الدرجات |
| `ExamForm` | إنشاء/تعديل امتحان: العنوان، المادة، الصف، الوقت، الوضع (ثابت/عشوائي)، تاريخ الفتح والإغلاق |
| `QuestionForm` | اختيار نوع السؤال (MCQ أو مقالي) ثم يفتح الفورم المناسب |
| `MCQForm` | نص السؤال + 4 خيارات + تحديد الصحيح + رفع صورة (اختياري) + الدرجة |
| `EssayForm` | نص السؤال + رفع صورة (مهم للرياضيات) + الدرجة |
| `ImageUploader` | drag & drop أو ضغط لرفع صورة — يرفع على Firebase Storage ويرجع الرابط |
| `ResultsTable` | جدول فيه كل الطلاب: الاسم، الصف، الدرجة، الوقت، تاريخ التسليم |
| `EssayGrader` | المدرس يشوف إجابة الطالب المقالية + صورة السؤال ويحط الدرجة |
| `ExportButton` | يصدر النتائج كـ Excel أو CSV |

---

## 4. Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // المدرس فقط يقدر يقرأ ويكتب في teachers
    match /teachers/{teacherId} {
      allow read, write: if request.auth != null && request.auth.uid == teacherId;
    }

    // المدرس يقدر يعمل CRUD على الامتحانات
    // الطلاب يقدروا يقرأوا الامتحان النشط فقط عن طريق classCode
    match /exams/{examId} {
      allow read: if true;  // الطالب محتاج يقرأ عشان يوصل للامتحان
      allow create, update, delete: if request.auth != null;  // المدرس فقط
    }

    // نفس القواعد للأسئلة
    match /questions/{questionId} {
      allow read: if true;  // الطالب محتاج يقرأ الأسئلة
      allow create, update, delete: if request.auth != null;  // المدرس فقط
    }

    // الطالب يقدر يكتب submission واحد فقط
    // المدرس يقدر يقرأ ويعدل (التصحيح)
    match /submissions/{submissionId} {
      allow create: if true;  // الطالب يسلم بدون تسجيل دخول
      allow read: if true;    // الطالب يشوف نتيجته + المدرس يشوف كل النتائج
      allow update: if request.auth != null;  // المدرس فقط يصحح
      allow delete: if request.auth != null;
    }
  }
}

// Firebase Storage Rules
service firebase.storage {
  match /b/{bucket}/o {
    match /questions/{allPaths=**} {
      allow read: if true;           // أي حد يشوف صور الأسئلة
      allow write: if request.auth != null;  // المدرس فقط يرفع
    }
  }
}
```

---

## 5. منطق التوزيع العشوائي للامتحان

```javascript
// src/lib/examUtils.js

// دالة التوزيع العشوائي — تاخد اسم الطالب كـ seed
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentSeed = seed;

  // Simple seeded random
  function random() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  }

  // Fisher-Yates shuffle with seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// توليد seed من اسم الطالب
function nameToSeed(studentName) {
  return studentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function prepareExam(questions, studentName, mode) {
  if (mode === 'fixed') {
    // كل الطلاب نفس الترتيب
    return questions.sort((a, b) => a.order - b.order);
  }

  if (mode === 'random') {
    const seed = nameToSeed(studentName);

    // 1. ترتيب الأسئلة عشوائي
    const shuffledQuestions = seededShuffle(questions, seed);

    // 2. ترتيب الخيارات عشوائي لكل سؤال MCQ
    return shuffledQuestions.map((q, index) => {
      if (q.type === 'mcq') {
        const optionIndices = [0, 1, 2, 3];
        const shuffledIndices = seededShuffle(optionIndices, seed + index);
        return {
          ...q,
          options: shuffledIndices.map(i => q.options[i]),
          // تتبع الإجابة الصحيحة بعد التبديل
          correctAnswer: shuffledIndices.indexOf(q.correctAnswer)
        };
      }
      return q;
    });
  }
}

// تصحيح MCQ تلقائي
export function gradeMCQ(questions, answers) {
  let score = 0;
  questions.forEach(q => {
    if (q.type === 'mcq' && answers[q.id]?.answer === q.correctAnswer) {
      score += q.marks;
    }
  });
  return score;
}
```

---

## 6. رفع الصور — Firebase Storage

```javascript
// src/lib/storage.js
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

export async function uploadQuestionImage(file, examId, questionId) {
  // المسار: questions/{examId}/{questionId}/{filename}
  const path = `questions/${examId}/${questionId}/${file.name}`;
  const storageRef = ref(storage, path);

  // رفع الملف
  const snapshot = await uploadBytes(storageRef, file);

  // الحصول على الرابط العام
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

export async function deleteQuestionImage(imageUrl) {
  const storageRef = ref(storage, imageUrl);
  await deleteObject(storageRef);
}
```

### مكون ImageUploader

```
المدرس يسحب صورة أو يضغط للرفع
        ↓
يظهر preview للصورة
        ↓
لما يحفظ السؤال → يرفع على Firebase Storage
        ↓
يرجع الرابط ويتحفظ في حقل imageUrl في السؤال
        ↓
الطالب يشوف الصورة جنب السؤال في الامتحان
```

**مهم للرياضيات**: الصور ضرورية لأن المعادلات والرسومات البيانية مش بتتكتب بسهولة كنص.

---

## 7. تصحيح الأسئلة المقالية

### Flow كامل

```
1. الطالب يسلم الامتحان
        ↓
2. MCQ يتصحح تلقائي فورا → mcqScore يتحسب
        ↓
3. المقالي → status = "submitted"، essayScore = null
        ↓
4. المدرس يفتح لوحة التحكم → يشوف الامتحانات اللي فيها مقالي غير مصحح
        ↓
5. يفتح EssayGrader → يشوف:
   - نص السؤال + صورة السؤال
   - إجابة الطالب النصية
   - الدرجة الكلية للسؤال
        ↓
6. المدرس يحط درجة لكل سؤال مقالي
        ↓
7. essayScore يتحسب → totalScore = mcqScore + essayScore
        ↓
8. status يتغير لـ "graded"
```

### واجهة EssayGrader

```
┌──────────────────────────────────────────────┐
│  تصحيح إجابات: محمد أحمد — امتحان الباب الأول  │
├──────────────────────────────────────────────┤
│                                              │
│  السؤال 4 (مقالي — 10 درجات):               │
│  ┌─────────────────────────────────┐        │
│  │ أوجد مشتقة الدالة التالية:      │        │
│  │ [صورة المعادلة]                 │        │
│  └─────────────────────────────────┘        │
│                                              │
│  إجابة الطالب:                               │
│  ┌─────────────────────────────────┐        │
│  │ ص = 3س² + 2س                   │        │
│  │ ص` = 6س + 2                    │        │
│  └─────────────────────────────────┘        │
│                                              │
│  الدرجة: [___8___] / 10                     │
│                                              │
│  [السؤال التالي →]  [حفظ وإنهاء التصحيح]    │
└──────────────────────────────────────────────┘
```

---

## 8. المخاطر وحدود Firebase Free Tier

### حدود الباقة المجانية (Spark)

| المورد | الحد المجاني | استهلاكك المتوقع (400 طالب) |
|--------|-------------|---------------------------|
| Firestore reads | 50,000/يوم | ~5,000/يوم ✅ |
| Firestore writes | 20,000/يوم | ~2,000/يوم ✅ |
| Firestore storage | 1 GB | < 50 MB ✅ |
| Firebase Storage | 5 GB | < 500 MB ✅ |
| Storage downloads | 1 GB/يوم | < 200 MB ✅ |
| Auth users | unlimited | ✅ |

### المخاطر الحقيقية

| المخاطر | الحل |
|---------|------|
| 400 طالب يفتحوا الامتحان في نفس الثانية | Firestore يتحمل — مصمم لـ concurrent reads |
| المدرس يرفع صور كتير بدقة عالية | ضغط الصور قبل الرفع (max 1MB per image) |
| طالب يسلم مرتين | Check بالـ studentName + examId قبل السماح بالتسليم |
| الإنترنت ينقطع وقت التسليم | حفظ الإجابات في localStorage كل سؤال — retry لما النت يرجع |
| أكتر من 50,000 read في يوم واحد | مش هيحصل مع 400 طالب — هتحتاج +2000 طالب عشان تقرب |

---

## 9. NPM Packages المطلوبة

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",

    "firebase": "^10.0.0",

    "tailwindcss": "^3.4.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",

    "react-hot-toast": "^2.4.0",
    "react-icons": "^5.0.0",

    "xlsx": "^0.18.0",
    "file-saver": "^2.0.0",

    "react-dropzone": "^14.0.0",

    "date-fns": "^3.0.0"
  }
}
```

| Package | الاستخدام |
|---------|----------|
| `next` | Framework الأساسي |
| `firebase` | Auth + Firestore + Storage |
| `tailwindcss` | التنسيق |
| `react-hot-toast` | رسائل النجاح والخطأ |
| `react-icons` | الأيقونات |
| `xlsx` | تصدير النتائج كـ Excel |
| `file-saver` | حفظ الملف المصدّر |
| `react-dropzone` | drag & drop لرفع الصور |
| `date-fns` | تنسيق التواريخ بالعربي |

---

## 10. ترتيب التطوير — من اليوم الأول للتسليم

### الأسبوع الأول — الأساس

| اليوم | المهمة |
|-------|--------|
| **يوم 1** | إنشاء مشروع Next.js + إعداد Tailwind بالألوان + إعداد Firebase project + ملف .env.local |
| **يوم 2** | Firebase Auth — تسجيل دخول المدرس + حماية صفحات الداشبورد + Sidebar و Header |
| **يوم 3** | فورم إنشاء امتحان (ExamForm) + حفظ في Firestore + صفحة قائمة الامتحانات |
| **يوم 4** | فورم إضافة أسئلة MCQ (MCQForm) + رفع صور (ImageUploader) + حفظ في Firestore |
| **يوم 5** | فورم إضافة أسئلة مقالية (EssayForm) + عرض الأسئلة المحفوظة + تعديل وحذف |

### الأسبوع الثاني — واجهة الطالب + النتائج

| اليوم | المهمة |
|-------|--------|
| **يوم 6** | صفحة دخول الطالب بكود الامتحان + فورم الاسم والصف |
| **يوم 7** | صفحة الامتحان الفعلية: عرض الأسئلة + Timer + التنقل بين الأسئلة |
| **يوم 8** | منطق التوزيع العشوائي + التسليم + التصحيح التلقائي لـ MCQ + حفظ النتيجة |
| **يوم 9** | صفحة النتيجة للطالب + جدول النتائج في الداشبورد + واجهة تصحيح المقالي |
| **يوم 10** | تصدير Excel/CSV + اختبار شامل + Deploy على Vercel + ربط الـ subdomain |

---

## الملخص

```
Tech Stack:
├── Frontend:  Next.js 14 + React 18 + Tailwind CSS
├── Database:  Firebase Firestore
├── Auth:      Firebase Auth (المدرس فقط)
├── Storage:   Firebase Storage (صور الأسئلة)
├── Hosting:   Vercel (free)
├── Domain:    exams.ahmed-srour.com (CNAME on Hostinger)
├── Language:  عربي بالكامل — RTL
└── Theme:     مطابق لموقع ahmed-srour.com (أزرق غامق + أحمر)
```
