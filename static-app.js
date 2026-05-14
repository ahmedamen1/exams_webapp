const demo = {
  exams: [{
    id: "exam-1", title: "امتحان الباب الأول — تفاضل", subject: "رياضيات", grade: "الثالث الثانوي",
    classCode: "MATH3A", timeLimit: 45, mode: "random", status: "active", totalMarks: 30, questionsCount: 4
  }],
  questions: [
    { id: "q-1", examId: "exam-1", type: "mcq", text: "إذا كانت ص = ٣س² + ٢س، فما قيمة صَ؟", imageText: "ص = ٣س² + ٢س", marks: 5, order: 1, options: ["٦س + ٢", "٣س + ٢", "٦س² + ٢", "س² + ٢"], correctAnswer: 0 },
    { id: "q-2", examId: "exam-1", type: "mcq", text: "ناتج تكامل ٢س بالنسبة إلى س يساوي:", imageText: "∫ ٢س د س", marks: 5, order: 2, options: ["س² + ج", "٢س² + ج", "س + ج", "٢ + ج"], correctAnswer: 0 },
    { id: "q-3", examId: "exam-1", type: "mcq", text: "إذا كان ميل المماس عند نقطة يساوي صفر، فالنقطة غالبا:", marks: 5, order: 3, options: ["حرجة", "غير معرفة", "بداية المجال", "نهاية المجال"], correctAnswer: 0 },
    { id: "q-4", examId: "exam-1", type: "essay", text: "أوجد مشتقة الدالة التالية مع توضيح خطوات الحل.", imageText: "ص = (س² + ١)(٣س - ٢)", marks: 15, order: 4 }
  ],
  submissions: [{ id: "sub-1", examId: "exam-1", studentName: "محمد أحمد", studentPhone: "01012345678", studentGrade: "3ث", classCode: "MATH3A", mcqScore: 10, essayScore: null, totalScore: null, totalMarks: 30, status: "submitted", submittedAt: "2026-05-14T17:30", answers: { "q-1": { answer: 0, isCorrect: true }, "q-2": { answer: 0, isCorrect: true }, "q-3": { answer: 2, isCorrect: false }, "q-4": { answer: "باستخدام قاعدة الضرب: صَ = ٢س(٣س - ٢) + ٣(س² + ١)" } } }]
};

const key = "yalla-nfhm-static";
const SUPABASE_URL = "https://gksxfhjjpwmxvpjsyxwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrc3hmaGpqcHdteHZwanN5eHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Njk5NDEsImV4cCI6MjA5NDM0NTk0MX0.TonBpjhxDSIIGcjSod8EYEhT1Lc-16_xCtRCzUsba8M";
const SUPABASE_BUCKET = "exam-images";

function safeFileName(file) {
  const extension = file.name.split(".").pop() || "jpg";
  return `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension.replace(/[^a-zA-Z0-9]/g, "")}`;
}

async function uploadFileToSupabase(file, folder) {
  const path = `${folder}/${safeFileName(file)}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase upload failed");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

function previewLocalImage(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function normalizeOption(option) {
  if (typeof option === "object" && option !== null) return { text: option.text || "", imageData: option.imageData || "" };
  return { text: option || "", imageData: "" };
}

function normalizeQuestion(question) {
  return {
    ...question,
    imageData: question.imageData || "",
    modelAnswer: question.modelAnswer || "",
    modelAnswerImage: question.modelAnswerImage || "",
    groupKey: question.groupKey || String(question.order || 1),
    options: (question.options || ["", "", "", ""]).map(normalizeOption)
  };
}

function normalizeState(input) {
  const normalized = input || structuredClone(demo);
  normalized.exams = normalized.exams || [];
  normalized.questions = (normalized.questions || []).map(normalizeQuestion);
  normalized.bankQuestions = (normalized.bankQuestions || normalized.questions.map((question) => ({
    ...question,
    id: `bank-${question.id}`,
    examId: null,
    sourceExamId: question.examId
  }))).map(normalizeQuestion);
  normalized.submissions = normalized.submissions || [];
  return normalized;
}

let state = normalizeState(JSON.parse(localStorage.getItem(key) || "null"));
const isDashboardEntry = location.pathname.toLowerCase().includes("dashboard");
let view = isDashboardEntry ? (sessionStorage.getItem("teacherUnlocked") === "yes" ? "dashboard" : "adminLogin") : "home";
let code = "";
let student = { name: "", phone: "", grade: "3ث" };
let session = null;
let answers = {};
let current = 0;
let remaining = 0;
let timer = null;
let notice = "";
let selectedExamId = state.exams[0]?.id || "";
let selectedSubmissionId = state.submissions[0]?.id || "";
let pendingQuestionImage = "";
let pendingModelAnswerImage = "";
let pendingOptionImages = ["", "", "", ""];
let draggedBankQuestionId = "";
let pendingAnswerImages = {};

const $ = (id) => document.getElementById(id);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const save = () => localStorage.setItem(key, JSON.stringify(state));
const flash = (message) => {
  notice = message;
  const shellNode = document.querySelector(".shell");
  if (shellNode) {
    let noticeNode = document.querySelector(".notice");
    if (!noticeNode) {
      noticeNode = document.createElement("div");
      noticeNode.className = "notice";
      const topbar = document.querySelector(".topbar");
      topbar?.insertAdjacentElement("afterend", noticeNode);
    }
    noticeNode.textContent = message;
  }
  window.setTimeout(() => {
    notice = "";
    const noticeNode = document.querySelector(".notice");
    if (noticeNode) noticeNode.remove();
  }, 2600);
};
const adminViews = ["adminLogin", "dashboard", "exams", "newExam", "results"];

function questionMedia(question) {
  if (question.imageData) {
    return `<figure class="question-image"><img src="${question.imageData}" alt="صورة السؤال" /></figure>`;
  }
  if (question.imageText) {
    return `<div class="equation">${question.imageText}</div>`;
  }
  return "";
}

function optionText(option) {
  return normalizeOption(option).text;
}

function optionAnswerLabel(option) {
  const normalized = normalizeOption(option);
  if (normalized.text && normalized.imageData) return `${normalized.text} + صورة`;
  if (normalized.text) return normalized.text;
  if (normalized.imageData) return "اختيار بصورة";
  return "اختيار فارغ";
}

function optionHTML(option) {
  const normalized = normalizeOption(option);
  return `<span class="option-content">${normalized.imageData ? `<img src="${normalized.imageData}" alt="صورة الاختيار" />` : ""}${normalized.text ? `<span>${normalized.text}</span>` : ""}</span>`;
}

function answerText(question, answer) {
  if (!answer || answer.answer === undefined || answer.answer === "") return "لم يجب";
  if (answer.answerImage) return `${answer.answer ? `${answer.answer} + ` : ""}صورة مرفقة`;
  if (answer.answerLabel) return answer.answerLabel;
  if (question.type === "mcq") return optionAnswerLabel(question.options?.[answer.answer]);
  return answer.answer;
}

function correctText(question, answer) {
  if (answer?.correctLabel) return answer.correctLabel;
  if (question.type !== "mcq") {
    if (question.modelAnswer && question.modelAnswerImage) return `${question.modelAnswer} + صورة نموذجية`;
    if (question.modelAnswer) return question.modelAnswer;
    if (question.modelAnswerImage) return "صورة نموذجية مرفقة";
    return "تصحيح يدوي";
  }
  return optionAnswerLabel(question.options?.[question.correctAnswer]);
}

function shuffle(array, seed) {
  const out = [...array];
  let s = seed || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function seedName(name) {
  return [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function seededIndex(seed, length) {
  if (!length) return 0;
  const value = (seed * 9301 + 49297) % 233280;
  return Math.floor((value / 233280) * length);
}

function prepare(questions, name, mode) {
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  const seed = seedName(name);

  const groups = ordered.reduce((acc, question) => {
    const key = question.groupKey || String(question.order || acc.size + 1);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(question);
    return acc;
  }, new Map());

  const selectedQuestions = [...groups.entries()]
    .sort((a, b) => Math.min(...a[1].map((q) => q.order)) - Math.min(...b[1].map((q) => q.order)))
    .map(([key, variants], index) => {
      const sortedVariants = variants.sort((a, b) => a.order - b.order);
      if (mode !== "random" || sortedVariants.length === 1) return sortedVariants[0];
      return sortedVariants[seededIndex(seed + index + key.length, sortedVariants.length)];
    });

  return selectedQuestions.map((question, index) => {
    if (question.type !== "mcq") return question;
    const indices = question.options.map((_, i) => i);
    const shuffled = shuffle(indices, seed + index + 7);
    return { ...question, options: shuffled.map((i) => question.options[i]), correctAnswer: shuffled.indexOf(question.correctAnswer) };
  });
}

function mcqScore(questions, answerMap) {
  return questions.reduce((sum, question) => sum + (question.type === "mcq" && answerMap[question.id]?.answer === question.correctAnswer ? Number(question.marks) : 0), 0);
}

function equivalentQuestionSet(questions) {
  const groups = new Map();
  [...questions].sort((a, b) => a.order - b.order).forEach((question) => {
    const key = question.groupKey || String(question.order || groups.size + 1);
    if (!groups.has(key)) groups.set(key, question);
  });
  return [...groups.values()];
}

function shell(content) {
  const admin = adminViews.includes(view);
  return `
    <div class="shell ${admin ? "admin-mode" : ""}">
      <header class="topbar ${admin ? "admin-topbar" : ""}">
        <button class="brand" onclick="go('home')" type="button">
          <img src="logo.png" alt="يلا نفهم Math" />
          <span><h1>${admin ? "لوحة تحكم الامتحانات" : "منصة امتحانات أ/ أحمد سرور"}</h1><p>${admin ? "إدارة الأسئلة، الطلاب، التصحيح، والتحليلات" : "رياضيات أونلاين بنظام عربي كامل"}</p></span>
        </button>
        <nav class="nav">
          ${admin ? `<a class="btn secondary" href="index.html">رابط الطلاب</a><a class="btn ${view === "dashboard" ? "gold" : "secondary"}" href="dashboard.html">لوحة المدرس</a>` : `<a class="btn ${view === "home" ? "gold" : "secondary"}" href="index.html">دخول الطالب</a>`}
        </nav>
      </header>
      ${notice ? `<div class="notice">${notice}</div>` : ""}
      ${content}
    </div>`;
}

function renderHome() {
  return `<main class="grid">
    <section class="panel">
      <h2 class="hero">ادخل كود الامتحان وابدأ الحل</h2>
      <p class="copy">واجهة عربية RTL للطالب، ومؤقت، وتنقل بين الأسئلة، وتصحيح MCQ فوري، ومقالي ينتظر تصحيح المدرس.</p>
      <form class="stack" onsubmit="openExam(event)">
        <div class="field"><label>كود الامتحان</label><input class="input" value="${code}" oninput="code=this.value.toUpperCase(); this.value=code" placeholder="مثال: MATH3A" /></div>
        <button class="btn primary">فتح الامتحان</button>
      </form>
    </section>
    <aside class="panel logo-card"><img src="logo.png" alt="شعار يلا نفهم Math" /></aside>
  </main>`;
}

function renderAdminLogin() {
  return `<main class="grid">
    <section class="panel admin-panel">
      <div class="admin-title"><div><span class="admin-kicker">TEACHER ACCESS</span><h2>دخول لوحة التحكم</h2></div></div>
      <form class="stack" onsubmit="unlockDashboard(event)">
        <div class="field">
          <label>كود المدرس</label>
          <input class="input" id="teacherCode" type="password" placeholder="اكتب كود الدخول" />
        </div>
        <button class="btn primary">فتح لوحة التحكم</button>
      </form>
      <p class="muted">كود الديمو: 1234. في النسخة الحقيقية يتم استبداله بتسجيل دخول Firebase Auth.</p>
    </section>
    <aside class="panel admin-panel logo-card"><img src="logo.png" alt="يلا نفهم Math" /></aside>
  </main>`;
}

function unlockDashboard(event) {
  event.preventDefault();
  if ($("teacherCode").value !== "1234") return flash("كود المدرس غير صحيح.");
  sessionStorage.setItem("teacherUnlocked", "yes");
  go("dashboard");
}

function openExam(event) {
  event.preventDefault();
  const exam = state.exams.find((item) => item.classCode.toUpperCase() === code.trim().toUpperCase());
  if (!exam) return flash("الكود غير موجود. جرّب MATH3A.");
  code = exam.classCode;
  go("student");
}

function renderStudent() {
  const exam = state.exams.find((item) => item.classCode === code);
  if (!exam) return `<main class="panel">الكود غير موجود.</main>`;
  return `<main class="grid">
    <section class="panel">
      <h2>${exam.title}</h2>
      <div class="stats">
        <div class="card stat"><span class="muted">الوقت</span><strong>${exam.timeLimit}</strong><span>دقيقة</span></div>
        <div class="card stat"><span class="muted">الأسئلة</span><strong>${exam.questionsCount}</strong></div>
        <div class="card stat"><span class="muted">الدرجات</span><strong>${exam.totalMarks}</strong></div>
        <div class="card stat"><span class="muted">الوضع</span><strong>${exam.mode === "random" ? "عشوائي" : "ثابت"}</strong></div>
      </div>
    </section>
    <section class="panel stack">
      <div class="field"><label>اسم الطالب</label><input class="input" value="${student.name}" oninput="student.name=this.value" /></div>
      <div class="field"><label>رقم تليفون الطالب</label><input class="input" inputmode="tel" value="${student.phone}" oninput="student.phone=this.value" placeholder="مثال: 01012345678" /></div>
      <div class="field"><label>الصف</label><input class="input" value="${student.grade}" oninput="student.grade=this.value" /></div>
      <button class="btn primary" onclick="startExam()">بدء الامتحان</button>
    </section>
  </main>`;
}

function startExam() {
  const exam = state.exams.find((item) => item.classCode === code);
  if (!student.name.trim()) return flash("اكتب اسم الطالب أولا.");
  if (!student.phone.trim()) return flash("اكتب رقم تليفون الطالب أولا.");
  const questions = state.questions.filter((question) => question.examId === exam.id);
  session = { exam, questions: prepare(questions, student.name.trim(), exam.mode), startedAt: Date.now() };
  answers = {};
  current = 0;
  remaining = Number(exam.timeLimit) * 60;
  clearInterval(timer);
  timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) submitExam(true);
    else if (view === "start") render();
  }, 1000);
  go("start");
}

function renderStart() {
  if (!session) return `<main class="panel">جاري تجهيز الامتحان...</main>`;
  const q = session.questions[current];
  const answered = session.questions.filter((item) => answers[item.id]?.answer !== undefined && answers[item.id]?.answer !== "").length;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  return `<main class="student">
    <section class="panel">
      <div class="split" style="justify-content:space-between"><h2>السؤال ${current + 1}</h2><span class="pill">${q.marks} درجات</span></div>
      <p class="copy">${q.text}</p>
      ${questionMedia(q)}
      ${q.type === "mcq" ? q.options.map((option, index) => `<button class="option ${answers[q.id]?.answer === index ? "selected" : ""}" onclick="answer('${q.id}', ${index})">${optionHTML(option)}</button>`).join("") : renderEssayAnswer(q)}
      <div class="split" style="margin-top:18px">
        <button class="btn secondary" onclick="move(-1)">السابق</button>
        <button class="btn secondary" onclick="move(1)">التالي</button>
        ${current === session.questions.length - 1 ? `<button class="btn primary" onclick="submitExam(false)">تسليم الامتحان</button>` : ""}
      </div>
    </section>
    <aside class="panel stack">
      <div class="card stat"><span class="muted">الوقت المتبقي</span><strong>${minutes}:${seconds}</strong></div>
      <div class="card"><strong>تمت الإجابة على ${answered} من ${session.questions.length}</strong></div>
      <div class="qnav">${session.questions.map((item, index) => `<button class="dot ${answers[item.id]?.answer !== undefined && answers[item.id]?.answer !== "" ? "answered" : ""} ${index === current ? "active" : ""}" onclick="current=${index};render()">${index + 1}</button>`).join("")}</div>
    </aside>
  </main>`;
}

function answer(id, value) {
  answers[id] = { answer: value };
  render();
}

function renderEssayAnswer(question) {
  const saved = answers[question.id] || {};
  return `<div class="essay-answer">
    <textarea class="textarea" placeholder="اكتب إجابتك هنا" oninput="answerEssayText('${question.id}', this.value)">${saved.answer || ""}</textarea>
    <div class="upload-box">
      <label>ارفع صورة للإجابة أو التقط صورة بالكاميرا</label>
      <input class="input" type="file" accept="image/*" capture="environment" onchange="previewAnswerImage(event, '${question.id}')" />
      <p class="muted">يمكن للطالب إرفاق صورة من كراسة الحل أو التقاط صورة مباشرة بالموبايل.</p>
      <div id="answerPreview-${question.id}" class="image-preview">${saved.answerImage ? `<img src="${saved.answerImage}" alt="صورة إجابة الطالب" />` : ""}</div>
    </div>
  </div>`;
}

function answerEssayText(id, value) {
  answers[id] = { ...(answers[id] || {}), answer: value };
}

function previewAnswerImage(event, questionId) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewLocalImage(file, (dataUrl) => {
    pendingAnswerImages[questionId] = dataUrl;
    answers[questionId] = { ...(answers[questionId] || {}), answerImage: dataUrl };
    const preview = $(`answerPreview-${questionId}`);
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="صورة إجابة الطالب" />`;
  });
  uploadFileToSupabase(file, "student-answers")
    .then((url) => {
      pendingAnswerImages[questionId] = url;
      answers[questionId] = { ...(answers[questionId] || {}), answerImage: url };
      const preview = $(`answerPreview-${questionId}`);
      if (preview) preview.innerHTML = `<img src="${url}" alt="صورة إجابة الطالب" /><p class="muted">تم رفع الصورة وحفظ رابطها.</p>`;
    })
    .catch((error) => flash(`لم يتم رفع الصورة: ${error.message}`));
}

function move(delta) {
  current = Math.max(0, Math.min(session.questions.length - 1, current + delta));
  render();
}

function submitExam(auto) {
  if (!session) return;
  clearInterval(timer);
  const normalized = {};
  session.questions.forEach((question) => {
    const value = answers[question.id]?.answer ?? "";
    normalized[question.id] = {
      answer: value,
      answerImage: answers[question.id]?.answerImage || pendingAnswerImages[question.id] || "",
      answerLabel: question.type === "mcq" ? optionAnswerLabel(question.options?.[value]) : undefined,
      correctLabel: question.type === "mcq" ? optionAnswerLabel(question.options?.[question.correctAnswer]) : undefined,
      isCorrect: question.type === "mcq" ? value === question.correctAnswer : null
    };
  });
  const score = mcqScore(session.questions, normalized);
  const hasEssay = session.questions.some((question) => question.type === "essay");
  session.submission = {
    id: uid("sub"), examId: session.exam.id, studentName: student.name, studentPhone: student.phone, studentGrade: student.grade, classCode: session.exam.classCode,
    answers: normalized, mcqScore: score, essayScore: hasEssay ? null : 0, totalScore: hasEssay ? null : score,
    totalMarks: session.questions.reduce((sum, question) => sum + Number(question.marks), 0), status: hasEssay ? "submitted" : "graded",
    submittedAt: new Date().toISOString()
  };
  state.submissions.unshift(session.submission);
  save();
  go("result");
  flash(auto ? "انتهى الوقت وتم التسليم تلقائيا." : "تم تسليم الامتحان بنجاح.");
}

function renderResult() {
  const sub = session?.submission || state.submissions.find((item) => item.classCode === code);
  if (!sub) return `<main class="panel">لا توجد نتيجة محفوظة.</main>`;
  return `<main class="panel" style="max-width:900px;margin:0 auto">
    <div class="split" style="justify-content:space-between"><h2>نتيجة الطالب</h2><span class="pill ${sub.status === "graded" ? "green" : ""}">${sub.status === "graded" ? "تم التصحيح" : "في انتظار تصحيح المقالي"}</span></div>
    <div class="stats">
      <div class="card stat"><span class="muted">MCQ</span><strong>${sub.mcqScore}</strong></div>
      <div class="card stat"><span class="muted">المقالي</span><strong>${sub.essayScore ?? "..."}</strong></div>
      <div class="card stat"><span class="muted">المجموع</span><strong>${sub.totalScore ?? "..."}</strong></div>
      <div class="card stat"><span class="muted">من</span><strong>${sub.totalMarks}</strong></div>
    </div>
  </main>`;
}

function dash(content) {
  return `<main class="dash admin-dash">
    <aside class="panel sidebar admin-sidebar">
      <div class="admin-kicker">CONTROL BOARD</div>
      <button class="btn secondary" onclick="go('dashboard')">الرئيسية</button>
      <button class="btn secondary" onclick="go('exams')">الامتحانات والأسئلة</button>
      <button class="btn secondary" onclick="go('newExam')">إنشاء امتحان</button>
      <button class="btn secondary" onclick="go('results')">النتائج والتصحيح</button>
    </aside>
    <section class="stack">${content}</section>
  </main>`;
}

function renderDashboard() {
  const graded = state.submissions.filter((item) => item.status === "graded");
  const avg = graded.length ? Math.round(graded.reduce((sum, item) => sum + item.totalScore, 0) / graded.length) : 0;
  const pending = state.submissions.filter((item) => item.status !== "graded").length;
  const students = new Set(state.submissions.map((item) => item.studentPhone || item.studentName)).size;
  const latest = state.submissions.slice(0, 5);
  return dash(`<section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">OVERVIEW</span><h2>مركز التحكم المتقدم</h2></div><button class="btn secondary" onclick="resetDemo()">استعادة الديمو</button></div>
    <div class="admin-stats">
      <div class="card stat admin-stat"><span class="muted">الامتحانات</span><strong>${state.exams.length}</strong><small>${state.exams.filter((e) => e.status === "active").length} نشط</small></div>
      <div class="card stat admin-stat"><span class="muted">الطلاب</span><strong>${students}</strong><small>برقم تليفون</small></div>
      <div class="card stat admin-stat"><span class="muted">تحتاج تصحيح</span><strong>${pending}</strong><small>إجابات مقالية</small></div>
      <div class="card stat admin-stat"><span class="muted">متوسط الدرجات</span><strong>${avg}</strong><small>للمصحح فقط</small></div>
    </div>
  </section>
  <section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">LIVE ACTIVITY</span><h2>آخر تسليمات الطلاب</h2></div><button class="btn gold" onclick="go('results')">فتح الإجابات</button></div>
    <div class="admin-feed">${latest.map((sub) => {
      const exam = state.exams.find((item) => item.id === sub.examId);
      return `<article class="feed-row"><div><strong>${sub.studentName}</strong><p class="muted">${sub.studentPhone || "بدون رقم"} | ${exam?.title || sub.classCode}</p></div><span class="pill ${sub.status === "graded" ? "green" : "red"}">${sub.status === "graded" ? "تم التصحيح" : "يحتاج تصحيح"}</span></article>`;
    }).join("") || `<p class="muted">لا توجد تسليمات بعد.</p>`}</div>
  </section>`);
}

function renderExams() {
  const exam = state.exams.find((item) => item.id === selectedExamId) || state.exams[0];
  selectedExamId = exam?.id || "";
  const questions = state.questions.filter((question) => question.examId === selectedExamId);
  const bank = state.bankQuestions || [];
  return dash(`<section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">EXAMS</span><h2>الامتحانات</h2></div><button class="btn primary" onclick="go('newExam')">إنشاء امتحان</button></div>
    <div class="stack">${state.exams.map((item) => `<article class="row"><div><strong>${item.title}</strong><p class="muted">${item.grade} | الكود: ${item.classCode} | ${item.questionsCount} سؤال | ${item.totalMarks} درجة</p></div><div class="actions"><button class="btn secondary" onclick="selectedExamId='${item.id}';render()">الأسئلة</button><button class="btn gold" onclick="openModelAnswer('${item.id}')">نموذج الإجابة</button><button class="btn danger" onclick="deleteExam('${item.id}')">حذف</button></div></article>`).join("")}</div>
  </section>
  <section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">QUESTION BANK</span><h2>إضافة سؤال إلى: ${exam?.title || ""}</h2></div><span class="pill">نص أو صورة</span></div>
    <form class="form" onsubmit="addQuestion(event)">
      <div class="field"><label>النوع</label><select class="select" id="qtype"><option value="mcq">اختيار من متعدد</option><option value="essay">مقالي</option></select></div>
      <div class="field"><label>الدرجة</label><input class="input" id="qmarks" type="number" value="5" /></div>
      <div class="field"><label>مجموعة السؤال / رقم السؤال المكافئ</label><input class="input" id="qgroup" value="${questions.length + 1}" placeholder="مثال: 1" /></div>
      <div class="field full"><label>نص السؤال أو تعليمات قصيرة</label><textarea class="textarea" id="qtext" placeholder="يمكن تركه قصيرا إذا كانت صورة السؤال واضحة"></textarea></div>
      <div class="field full"><label>نموذج إجابة المقالي / ملاحظات الحل</label><textarea class="textarea" id="qmodel" placeholder="للسؤال المقالي اكتب الحل النموذجي الذي سيظهر في نموذج الإجابة"></textarea></div>
      <div class="field full">
        <label>صورة الإجابة النموذجية للمقالي</label>
        <div class="upload-box">
          <input class="input" type="file" accept="image/*" onchange="previewModelAnswerImage(event)" />
          <p class="muted">يمكن رفع صورة حل كامل أو خطوات الحل النموذجي للسؤال المقالي.</p>
          <div id="modelAnswerPreview" class="image-preview">${pendingModelAnswerImage ? `<img src="${pendingModelAnswerImage}" alt="معاينة صورة الإجابة النموذجية" />` : ""}</div>
        </div>
      </div>
      <div class="field full">
        <label>صورة السؤال</label>
        <div class="upload-box">
          <input class="input" id="qfile" type="file" accept="image/*" onchange="previewQuestionImage(event)" />
          <p class="muted">ارفع صورة من ورقة الامتحان أو معادلة رياضيات. ستظهر للطالب داخل السؤال.</p>
          <div id="imagePreview" class="image-preview">${pendingQuestionImage ? `<img src="${pendingQuestionImage}" alt="معاينة صورة السؤال" />` : ""}</div>
        </div>
      </div>
      <div class="field full"><label>نص المعادلة أو وصف الصورة</label><input class="input" id="qimage" /></div>
      ${[0, 1, 2, 3].map((index) => `<div class="field option-edit"><label>اختيار ${index + 1}</label><input class="input" id="o${index}" placeholder="نص الاختيار" /><input class="input" id="of${index}" type="file" accept="image/*" onchange="previewOptionImage(event, ${index})" /><div id="optionPreview${index}" class="option-preview">${pendingOptionImages[index] ? `<img src="${pendingOptionImages[index]}" alt="معاينة صورة الاختيار" />` : ""}</div></div>`).join("")}
      <div class="field"><label>الإجابة الصحيحة</label><select class="select" id="correct"><option value="0">اختيار 1</option><option value="1">اختيار 2</option><option value="2">اختيار 3</option><option value="3">اختيار 4</option></select></div>
      <label class="check-line full"><input id="saveToBank" type="checkbox" checked /> حفظ السؤال في بنك الأسئلة أيضا</label>
      <button class="btn primary full">حفظ السؤال</button>
    </form>
  </section>
  <section class="bank-layout">
    <div class="panel admin-panel">
      <div class="admin-title"><div><span class="admin-kicker">CURRENT EXAM</span><h2>أسئلة الامتحان الحالي</h2></div><span class="pill">${questions.length} سؤال</span></div>
      <div class="drop-zone" ondragover="event.preventDefault()" ondrop="dropBankQuestion(event)">
        <p class="muted">اسحب أي سؤال من بنك الأسئلة هنا لإضافته لهذا الامتحان.</p>
        <div class="stack">${questions.map((q) => `<article class="row"><div><strong>مجموعة ${q.groupKey || q.order}: ${q.text || "سؤال بصورة فقط"}</strong><p class="muted">${q.type === "mcq" ? "اختيار من متعدد" : "مقالي"} | ${q.marks} درجات ${q.imageData ? "| يحتوي على صورة" : ""}</p>${q.imageData ? `<img class="thumb" src="${q.imageData}" alt="صورة السؤال" />` : ""}</div><div class="actions"><button class="btn secondary" onclick="openModelAnswer('${selectedExamId}')">النموذج</button><button class="btn danger" onclick="deleteQuestion('${q.id}')">حذف</button></div></article>`).join("")}</div>
      </div>
    </div>
    <div class="panel admin-panel">
      <div class="admin-title"><div><span class="admin-kicker">REUSABLE BANK</span><h2>بنك الأسئلة</h2></div><span class="pill">${bank.length} سؤال</span></div>
      <form class="stack bulk-box" onsubmit="bulkAddBank(event)">
        <div class="field">
          <label>إضافة أسئلة كثيرة مرة واحدة</label>
          <textarea class="textarea" id="bulkQuestions" placeholder="كل سطر: المجموعة | نص السؤال | اختيار1 | اختيار2 | اختيار3 | اختيار4 | رقم الصحيح | الدرجة"></textarea>
        </div>
        <button class="btn secondary" type="submit">إضافة للبنك</button>
      </form>
      <div class="bank-list">${bank.map((q) => `<article class="bank-card" draggable="true" ondragstart="dragBankQuestion('${q.id}')"><div><strong>مجموعة ${q.groupKey || q.order}: ${q.text || "سؤال بصورة فقط"}</strong><p class="muted">${q.type === "mcq" ? "اختيار من متعدد" : "مقالي"} | ${q.marks} درجات</p>${q.imageData ? `<img class="thumb" src="${q.imageData}" alt="صورة السؤال" />` : ""}</div><button class="btn secondary" onclick="addBankQuestionToExam('${q.id}')">إضافة للامتحان</button></article>`).join("")}</div>
    </div>
  </section>`);
}

function renderNewExam() {
  return dash(`<section class="panel">
    <h2>إنشاء امتحان جديد</h2>
    <form class="form" onsubmit="addExam(event)">
      <div class="field"><label>عنوان الامتحان</label><input class="input" id="title" /></div>
      <div class="field"><label>كود الامتحان</label><input class="input" id="classCode" /></div>
      <div class="field"><label>المادة</label><input class="input" id="subject" value="رياضيات" /></div>
      <div class="field"><label>الصف</label><input class="input" id="grade" value="الثالث الثانوي" /></div>
      <div class="field"><label>الوقت بالدقائق</label><input class="input" id="timeLimit" type="number" value="45" /></div>
      <div class="field"><label>الوضع</label><select class="select" id="mode"><option value="fixed">ثابت</option><option value="random">عشوائي</option></select></div>
      <div class="field"><label>الحالة</label><select class="select" id="status"><option value="draft">مسودة</option><option value="active">نشط</option><option value="closed">مغلق</option></select></div>
      <button class="btn primary full">حفظ الامتحان</button>
    </form>
  </section>`);
}

function getScore(submission) {
  return submission.totalScore ?? submission.mcqScore ?? 0;
}

function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function renderMiniBar(label, value, total, tone = "") {
  const width = Math.min(100, Math.max(0, percent(value, total)));
  return `<div class="chart-row">
    <div class="chart-label"><span>${label}</span><strong>${value}</strong></div>
    <div class="bar-track"><span class="bar-fill ${tone}" style="width:${width}%"></span></div>
  </div>`;
}

function buildQuestionStats() {
  const stats = {};
  state.submissions.forEach((submission) => {
    Object.entries(submission.answers || {}).forEach(([questionId, answer]) => {
      if (answer.isCorrect === null || answer.isCorrect === undefined) return;
      if (!stats[questionId]) stats[questionId] = { correct: 0, wrong: 0, total: 0 };
      stats[questionId].total += 1;
      if (answer.isCorrect) stats[questionId].correct += 1;
      else stats[questionId].wrong += 1;
    });
  });
  return stats;
}

function renderResultsAnalytics() {
  const submissions = state.submissions;
  const graded = submissions.filter((submission) => submission.status === "graded");
  const pending = submissions.length - graded.length;
  const scores = submissions.map(getScore);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const highest = scores.length ? Math.max(...scores) : 0;
  const lowest = scores.length ? Math.min(...scores) : 0;
  const passCount = submissions.filter((submission) => getScore(submission) >= (submission.totalMarks || 1) * 0.5).length;
  const buckets = [
    { label: "0 - 49%", count: 0, tone: "danger-fill" },
    { label: "50 - 69%", count: 0, tone: "warn-fill" },
    { label: "70 - 84%", count: 0, tone: "good-fill" },
    { label: "85 - 100%", count: 0, tone: "gold-fill" }
  ];

  submissions.forEach((submission) => {
    const scorePercent = percent(getScore(submission), submission.totalMarks || 1);
    if (scorePercent < 50) buckets[0].count += 1;
    else if (scorePercent < 70) buckets[1].count += 1;
    else if (scorePercent < 85) buckets[2].count += 1;
    else buckets[3].count += 1;
  });

  const examRows = state.exams.map((exam) => {
    const examSubs = submissions.filter((submission) => submission.examId === exam.id);
    const avg = examSubs.length ? Math.round(examSubs.reduce((sum, submission) => sum + getScore(submission), 0) / examSubs.length) : 0;
    return { exam, count: examSubs.length, avg };
  });

  const questionStats = buildQuestionStats();
  const hardestQuestions = Object.entries(questionStats)
    .map(([questionId, stat]) => {
      const question = state.questions.find((item) => item.id === questionId);
      return { question, ...stat, wrongRate: percent(stat.wrong, stat.total) };
    })
    .filter((item) => item.question)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 4);

  const reviewItems = [];
  if (pending) reviewItems.push(`${pending} تسليم يحتاج تصحيح مقالي.`);
  if (!submissions.length) reviewItems.push("لا توجد تسليمات بعد، جرّب نشر كود الامتحان للطلاب.");
  if (hardestQuestions[0]?.wrongRate >= 50) reviewItems.push(`السؤال الأصعب حاليا عليه نسبة خطأ ${hardestQuestions[0].wrongRate}%.`);
  state.exams.filter((exam) => !submissions.some((submission) => submission.examId === exam.id)).forEach((exam) => {
    reviewItems.push(`امتحان "${exam.title}" لا يحتوي على تسليمات حتى الآن.`);
  });
  if (!reviewItems.length) reviewItems.push("الوضع جيد: لا توجد تنبيهات مهمة حاليا.");

  return `<section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">SMART ANALYTICS</span><h2>تحليلات ذكية للنتائج</h2></div><span class="pill">${submissions.length} تسليم</span></div>
    <div class="analytics-grid">
      <div class="card admin-stat"><span class="muted">متوسط الدرجات</span><strong>${average}</strong><small>من التسليمات الحالية</small></div>
      <div class="card admin-stat"><span class="muted">أعلى درجة</span><strong>${highest}</strong><small>أفضل أداء</small></div>
      <div class="card admin-stat"><span class="muted">أقل درجة</span><strong>${lowest}</strong><small>تحتاج متابعة</small></div>
      <div class="card admin-stat"><span class="muted">نسبة النجاح</span><strong>${percent(passCount, submissions.length)}%</strong><small>${passCount} من ${submissions.length}</small></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>توزيع الدرجات</h3>
        ${buckets.map((bucket) => renderMiniBar(bucket.label, bucket.count, Math.max(1, submissions.length), bucket.tone)).join("")}
      </div>
      <div class="chart-card">
        <h3>متوسط كل امتحان</h3>
        ${examRows.map((row) => renderMiniBar(row.exam.title, row.avg, Math.max(1, row.exam.totalMarks || 100), "good-fill")).join("") || `<p class="muted">لا توجد امتحانات.</p>`}
      </div>
      <div class="chart-card">
        <h3>أكثر الأسئلة خطأ</h3>
        ${hardestQuestions.map((item) => renderMiniBar(item.question.text || `سؤال ${item.question.order}`, item.wrongRate, 100, "danger-fill")).join("") || `<p class="muted">لا توجد بيانات كافية بعد.</p>`}
      </div>
      <div class="chart-card">
        <h3>مراجعة ذكية</h3>
        <ul class="review-list">${reviewItems.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    </div>
  </section>`;
}

function renderResults() {
  const selected = state.submissions.find((sub) => sub.id === selectedSubmissionId) || state.submissions[0];
  return dash(`${renderResultsAnalytics()}<section class="panel admin-panel">
    <div class="admin-title"><div><span class="admin-kicker">RESULTS</span><h2>النتائج والتصحيح</h2></div><div class="split"><button class="btn secondary" onclick="exportAnswersCsv()">تصدير الإجابات</button><button class="btn gold" onclick="exportCsv()">تصدير النتائج</button></div></div>
    <div class="table"><table><thead><tr><th>الطالب</th><th>التليفون</th><th>الامتحان</th><th>MCQ</th><th>المقالي</th><th>المجموع</th><th>الحالة</th><th>الإجابات</th><th>تصحيح</th></tr></thead><tbody>
    ${state.submissions.map((sub) => {
      const exam = state.exams.find((item) => item.id === sub.examId);
      return `<tr><td>${sub.studentName}<br><span class="muted">${sub.studentGrade}</span></td><td>${sub.studentPhone || "—"}</td><td>${exam?.title || sub.classCode}</td><td>${sub.mcqScore}</td><td>${sub.essayScore ?? "في الانتظار"}</td><td>${sub.totalScore ?? "غير مكتمل"}</td><td><span class="pill ${sub.status === "graded" ? "green" : "red"}">${sub.status === "graded" ? "تم التصحيح" : "يحتاج تصحيح"}</span></td><td><button class="btn secondary" onclick="selectedSubmissionId='${sub.id}';render()">عرض</button></td><td>${sub.status === "graded" ? "—" : `<input class="input" id="g-${sub.id}" type="number" style="width:90px"><button class="btn secondary" onclick="grade('${sub.id}')">حفظ</button>`}</td></tr>`;
    }).join("")}</tbody></table></div>
  </section>
  ${selected ? renderAnswerReview(selected) : `<section class="panel admin-panel"><p class="muted">اختر طالبا لعرض إجاباته.</p></section>`}`);
}

function renderAnswerReview(submission) {
  const exam = state.exams.find((item) => item.id === submission.examId);
  const questions = state.questions.filter((question) => question.examId === submission.examId).sort((a, b) => a.order - b.order);
  return `<section class="panel admin-panel answer-review">
    <div class="admin-title">
      <div><span class="admin-kicker">STUDENT ANSWERS</span><h2>إجابات ${submission.studentName}</h2><p class="muted">${submission.studentPhone || "بدون رقم"} | ${exam?.title || submission.classCode}</p></div>
      <span class="pill ${submission.status === "graded" ? "green" : "red"}">${submission.status === "graded" ? "تم التصحيح" : "ينتظر تصحيح المقالي"}</span>
    </div>
    <div class="answers-grid">${questions.map((question) => {
      const answer = submission.answers?.[question.id];
      const correct = answer?.isCorrect === true;
      const wrong = answer?.isCorrect === false;
      return `<article class="answer-card ${correct ? "answer-correct" : ""} ${wrong ? "answer-wrong" : ""}">
        <div class="split" style="justify-content:space-between"><strong>سؤال ${question.order}</strong><span class="pill">${question.marks} درجات</span></div>
        <p>${question.text || "سؤال بصورة فقط"}</p>
        ${questionMedia(question)}
        <div class="answer-line"><span>إجابة الطالب</span><strong>${answerText(question, answer)}</strong></div>
        ${answer?.answerImage ? `<figure class="question-image"><img src="${answer.answerImage}" alt="صورة إجابة الطالب" /></figure>` : ""}
        <div class="answer-line"><span>الإجابة الصحيحة</span><strong>${correctText(question, answer)}</strong></div>
        ${question.modelAnswerImage ? `<figure class="question-image"><img src="${question.modelAnswerImage}" alt="صورة الإجابة النموذجية" /></figure>` : ""}
      </article>`;
    }).join("")}</div>
  </section>`;
}

function addExam(event) {
  event.preventDefault();
  const exam = { id: uid("exam"), title: $("title").value, classCode: $("classCode").value.toUpperCase(), subject: $("subject").value, grade: $("grade").value, timeLimit: Number($("timeLimit").value), mode: $("mode").value, status: $("status").value, totalMarks: 0, questionsCount: 0 };
  if (!exam.title || !exam.classCode) return flash("العنوان والكود مطلوبان.");
  state.exams.unshift(exam);
  selectedExamId = exam.id;
  save();
  go("exams");
  flash("تم حفظ الامتحان.");
}

function addQuestion(event) {
  event.preventDefault();
  const exam = state.exams.find((item) => item.id === selectedExamId);
  if (!exam) return flash("اختر امتحانا أولا.");
  const questions = state.questions.filter((question) => question.examId === exam.id);
  const options = [0, 1, 2, 3].map((index) => ({ text: $(`o${index}`).value, imageData: pendingOptionImages[index] || "" }));
  const groupKey = $("qgroup").value.trim() || String(questions.length + 1);
  const groupQuestions = questions.filter((question) => (question.groupKey || String(question.order)) === groupKey);
  const question = { id: uid("q"), examId: exam.id, type: $("qtype").value, text: $("qtext").value, imageText: $("qimage").value, imageData: pendingQuestionImage, modelAnswer: $("qmodel").value, modelAnswerImage: pendingModelAnswerImage, groupKey, marks: Number($("qmarks").value), order: groupQuestions[0]?.order || questions.length + 1, variantOrder: groupQuestions.length + 1, options, correctAnswer: Number($("correct").value) };
  if (!question.text && !question.imageData && !question.imageText) return flash("أضف نص السؤال أو صورة السؤال.");
  state.questions.push(question);
  if ($("saveToBank")?.checked) {
    state.bankQuestions.unshift({ ...question, id: uid("bank"), examId: null, sourceExamId: exam.id });
  }
  pendingQuestionImage = "";
  pendingModelAnswerImage = "";
  pendingOptionImages = ["", "", "", ""];
  syncExamTotals(exam.id);
  save();
  render();
  flash("تم حفظ السؤال.");
}

function syncExamTotals(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  const all = state.questions.filter((item) => item.examId === exam.id);
  const equivalent = equivalentQuestionSet(all);
  exam.questionsCount = equivalent.length;
  exam.totalMarks = equivalent.reduce((sum, item) => sum + Number(item.marks || 0), 0);
}

function cloneQuestionForExam(question, examId) {
  const examQuestions = state.questions.filter((item) => item.examId === examId);
  const groupKey = question.groupKey || String(examQuestions.length + 1);
  const groupQuestions = examQuestions.filter((item) => (item.groupKey || String(item.order)) === groupKey);
  return {
    ...normalizeQuestion(question),
    id: uid("q"),
    examId,
    sourceBankId: question.id,
    groupKey,
    order: groupQuestions[0]?.order || examQuestions.length + 1,
    variantOrder: groupQuestions.length + 1
  };
}

function addBankQuestionToExam(bankQuestionId) {
  const exam = state.exams.find((item) => item.id === selectedExamId);
  const bankQuestion = state.bankQuestions.find((item) => item.id === bankQuestionId);
  if (!exam || !bankQuestion) return flash("اختر امتحانا وسؤالا من البنك أولا.");
  state.questions.push(cloneQuestionForExam(bankQuestion, exam.id));
  syncExamTotals(exam.id);
  save();
  render();
  flash("تمت إضافة السؤال إلى الامتحان.");
}

function dragBankQuestion(bankQuestionId) {
  draggedBankQuestionId = bankQuestionId;
}

function dropBankQuestion(event) {
  event.preventDefault();
  if (draggedBankQuestionId) addBankQuestionToExam(draggedBankQuestionId);
  draggedBankQuestionId = "";
}

function bulkAddBank(event) {
  event.preventDefault();
  const text = $("bulkQuestions").value.trim();
  if (!text) return flash("اكتب الأسئلة أولا.");
  const added = text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    const [groupKey = "", questionText = "", o1 = "", o2 = "", o3 = "", o4 = "", correct = "1", marks = "1"] = parts;
    return {
      id: uid("bank"),
      examId: null,
      type: o1 || o2 || o3 || o4 ? "mcq" : "essay",
      text: questionText,
      imageText: "",
      imageData: "",
      groupKey: groupKey || String(state.bankQuestions.length + 1),
      marks: Number(marks) || 1,
      order: state.bankQuestions.length + 1,
      options: [o1, o2, o3, o4].map((option) => ({ text: option, imageData: "" })),
      correctAnswer: Math.max(0, Math.min(3, Number(correct) - 1 || 0))
    };
  });
  state.bankQuestions.unshift(...added);
  $("bulkQuestions").value = "";
  save();
  render();
  flash(`تمت إضافة ${added.length} سؤال إلى البنك.`);
}

function modelAnswerForQuestion(question) {
  if (question.type === "mcq") {
    return optionAnswerLabel(question.options?.[question.correctAnswer]);
  }
  return question.modelAnswer || (question.modelAnswerImage ? "انظر صورة الإجابة النموذجية." : "لم يتم إضافة نموذج إجابة لهذا السؤال بعد.");
}

function openModelAnswer(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return flash("لم يتم العثور على الامتحان.");
  const groups = new Map();
  state.questions
    .filter((question) => question.examId === examId)
    .sort((a, b) => a.order - b.order)
    .forEach((question) => {
      const key = question.groupKey || String(question.order);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(question);
    });

  const rows = [...groups.entries()].map(([key, variants], index) => {
    const variantBlocks = variants.map((question, variantIndex) => `
      <article class="model-question">
        <div class="model-meta">مجموعة ${key} ${variants.length > 1 ? `- نسخة ${variantIndex + 1}` : ""} | ${question.marks} درجات</div>
        <h3>${index + 1}. ${question.text || "سؤال بصورة"}</h3>
        ${question.imageData ? `<img class="model-image" src="${question.imageData}" alt="صورة السؤال" />` : ""}
        ${question.imageText ? `<div class="model-equation">${question.imageText}</div>` : ""}
        <div class="model-answer"><strong>الإجابة النموذجية:</strong><p>${modelAnswerForQuestion(question)}</p>${question.modelAnswerImage ? `<img class="model-image" src="${question.modelAnswerImage}" alt="صورة الإجابة النموذجية" />` : ""}</div>
      </article>
    `).join("");
    return `<section class="model-group">${variantBlocks}</section>`;
  }).join("");

  const html = `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>نموذج إجابة - ${exam.title}</title>
      <style>
        body { background:#f8fafc; color:#16213e; font-family:Tahoma, Arial, sans-serif; margin:0; padding:28px; direction:rtl; }
        .model-page { background:#fff; border:1px solid #dbe2ef; border-radius:10px; margin:auto; max-width:920px; padding:28px; }
        .model-head { align-items:center; border-bottom:2px solid #e94560; display:flex; justify-content:space-between; gap:16px; padding-bottom:16px; }
        .model-head img { border-radius:50%; height:70px; width:70px; }
        h1, h2, h3, p { margin-top:0; }
        .muted { color:#64748b; }
        .model-group { border-bottom:1px solid #e2e8f0; padding:18px 0; }
        .model-question { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:12px; padding:16px; }
        .model-meta { color:#e94560; font-weight:800; margin-bottom:8px; }
        .model-image { background:#fff; border:1px solid #dbe2ef; border-radius:8px; display:block; margin:12px 0; max-height:420px; max-width:100%; object-fit:contain; }
        .model-equation { background:#10182f; border-radius:8px; color:#fff7c2; font-size:1.2rem; margin:12px 0; padding:18px; text-align:center; }
        .model-answer { background:#fff; border:1px solid #dbe2ef; border-radius:8px; padding:14px; }
        .model-actions { display:flex; gap:10px; margin:18px 0; }
        button { background:#e94560; border:0; border-radius:8px; color:white; cursor:pointer; font-weight:800; padding:10px 16px; }
        @media print { body { background:#fff; padding:0; } .model-actions { display:none; } .model-page { border:0; } }
      </style>
    </head>
    <body>
      <main class="model-page">
        <header class="model-head">
          <div>
            <h1>نموذج إجابة</h1>
            <h2>${exam.title}</h2>
            <p class="muted">${exam.grade} | الكود: ${exam.classCode} | ${exam.totalMarks} درجة</p>
          </div>
          <img src="logo.png" alt="يلا نفهم Math" />
        </header>
        <div class="model-actions">
          <button onclick="window.print()">طباعة / حفظ PDF</button>
        </div>
        ${rows || `<p class="muted">لا توجد أسئلة في هذا الامتحان.</p>`}
      </main>
    </body>
  </html>`;

  const win = window.open("", "_blank");
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function previewQuestionImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewLocalImage(file, (dataUrl) => {
    pendingQuestionImage = dataUrl;
    const preview = $("imagePreview");
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="معاينة صورة السؤال" />`;
  });
  uploadFileToSupabase(file, "questions")
    .then((url) => {
      pendingQuestionImage = url;
      const preview = $("imagePreview");
      if (preview) preview.innerHTML = `<img src="${url}" alt="معاينة صورة السؤال" /><p class="muted">تم رفع الصورة وحفظ رابطها.</p>`;
    })
    .catch((error) => flash(`لم يتم رفع صورة السؤال: ${error.message}`));
}

function previewModelAnswerImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewLocalImage(file, (dataUrl) => {
    pendingModelAnswerImage = dataUrl;
    const preview = $("modelAnswerPreview");
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="معاينة صورة الإجابة النموذجية" />`;
  });
  uploadFileToSupabase(file, "model-answers")
    .then((url) => {
      pendingModelAnswerImage = url;
      const preview = $("modelAnswerPreview");
      if (preview) preview.innerHTML = `<img src="${url}" alt="معاينة صورة الإجابة النموذجية" /><p class="muted">تم رفع الصورة وحفظ رابطها.</p>`;
    })
    .catch((error) => flash(`لم يتم رفع صورة الإجابة النموذجية: ${error.message}`));
}

function previewOptionImage(event, index) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewLocalImage(file, (dataUrl) => {
    pendingOptionImages[index] = dataUrl;
    const preview = $(`optionPreview${index}`);
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="معاينة صورة الاختيار" />`;
  });
  uploadFileToSupabase(file, "options")
    .then((url) => {
      pendingOptionImages[index] = url;
      const preview = $(`optionPreview${index}`);
      if (preview) preview.innerHTML = `<img src="${url}" alt="معاينة صورة الاختيار" /><p class="muted">تم رفع الصورة.</p>`;
    })
    .catch((error) => flash(`لم يتم رفع صورة الاختيار: ${error.message}`));
}

function deleteExam(id) {
  state.exams = state.exams.filter((item) => item.id !== id);
  state.questions = state.questions.filter((item) => item.examId !== id);
  state.submissions = state.submissions.filter((item) => item.examId !== id);
  selectedExamId = state.exams[0]?.id || "";
  save();
  render();
}

function deleteQuestion(id) {
  const question = state.questions.find((item) => item.id === id);
  state.questions = state.questions.filter((item) => item.id !== id);
  if (question?.examId) syncExamTotals(question.examId);
  save();
  render();
}

function grade(id) {
  const sub = state.submissions.find((item) => item.id === id);
  const value = Number($(`g-${id}`).value || 0);
  sub.essayScore = value;
  sub.totalScore = sub.mcqScore + value;
  sub.status = "graded";
  save();
  render();
  flash("تم حفظ التصحيح.");
}

function exportCsv() {
  const rows = [["اسم الطالب", "التليفون", "الصف", "الامتحان", "MCQ", "المقالي", "المجموع", "الحالة"], ...state.submissions.map((sub) => [sub.studentName, sub.studentPhone || "", sub.studentGrade, state.exams.find((e) => e.id === sub.examId)?.title || "", sub.mcqScore, sub.essayScore ?? "في انتظار التصحيح", sub.totalScore ?? "غير مكتمل", sub.status])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = "exam-results.csv";
  link.click();
}

function exportAnswersCsv() {
  const rows = [["اسم الطالب", "التليفون", "الامتحان", "رقم السؤال", "نوع السؤال", "نص السؤال", "إجابة الطالب", "الإجابة الصحيحة", "الحالة"]];
  state.submissions.forEach((sub) => {
    const exam = state.exams.find((e) => e.id === sub.examId);
    const questions = state.questions.filter((question) => question.examId === sub.examId).sort((a, b) => a.order - b.order);
    questions.forEach((question) => {
      const answer = sub.answers?.[question.id];
      rows.push([
        sub.studentName,
        sub.studentPhone || "",
        exam?.title || sub.classCode,
        question.order,
        question.type === "mcq" ? "اختيار من متعدد" : "مقالي",
        question.text || "سؤال بصورة",
        answerText(question, answer),
        correctText(question, answer),
        answer?.isCorrect === true ? "صحيح" : answer?.isCorrect === false ? "خطأ" : "تصحيح يدوي"
      ]);
    });
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = "exam-answers-review.csv";
  link.click();
}

function resetDemo() {
  state = structuredClone(demo);
  selectedExamId = state.exams[0].id;
  save();
  render();
}

function go(next) {
  if (adminViews.includes(next) && next !== "adminLogin" && sessionStorage.getItem("teacherUnlocked") !== "yes") {
    view = "adminLogin";
    render();
    return;
  }
  view = next;
  render();
}

function render() {
  const content = {
    home: renderHome,
    student: renderStudent,
    start: renderStart,
    result: renderResult,
    adminLogin: renderAdminLogin,
    dashboard: renderDashboard,
    exams: renderExams,
    newExam: renderNewExam,
    results: renderResults
  }[view]();
  $("app").innerHTML = shell(content);
}

render();
