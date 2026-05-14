"use client";

import { useEffect, useMemo, useState } from "react";
import { answeredCount, gradeMCQ, prepareExam } from "@/lib/examUtils";
import { createId } from "@/lib/mockData";
import { exportSubmissionsCsv } from "@/lib/exportUtils";
import { loadState, resetState, saveState } from "@/lib/store";

const blankExam = {
  title: "",
  subject: "رياضيات",
  grade: "الثالث الثانوي",
  classCode: "",
  timeLimit: 45,
  mode: "fixed",
  status: "draft",
  openDate: "",
  closeDate: ""
};

const blankQuestion = {
  type: "mcq",
  text: "",
  imageText: "",
  imageData: "",
  groupKey: "",
  marks: 5,
  options: ["", "", "", ""],
  correctAnswer: 0
};

export default function ExamPlatform({ initialView = "home", classCode = "" }) {
  const [state, setState] = useState({ exams: [], questions: [], submissions: [] });
  const [view, setView] = useState(initialView);
  const [activeCode, setActiveCode] = useState(classCode?.toUpperCase() || "");
  const [student, setStudent] = useState({ name: "", phone: "", grade: "3ث" });
  const [examSession, setExamSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [notice, setNotice] = useState("");
  const [examForm, setExamForm] = useState(blankExam);
  const [questionForm, setQuestionForm] = useState(blankQuestion);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [gradingDraft, setGradingDraft] = useState({});

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state.exams.length) {
      saveState(state);
    }
  }, [state]);

  useEffect(() => {
    if (initialView === "start" && activeCode && !examSession && state.exams.length) {
      const savedStudent = JSON.parse(window.sessionStorage.getItem(`student-${activeCode}`) || "null");
      if (savedStudent) {
        beginExam(savedStudent);
      } else {
        setView("student");
      }
    }
  }, [state.exams.length]);

  useEffect(() => {
    if (view !== "start" || remainingSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          submitExam(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [view, remainingSeconds]);

  const activeExam = useMemo(
    () => state.exams.find((exam) => exam.classCode.toUpperCase() === activeCode.toUpperCase()),
    [activeCode, state.exams]
  );
  const selectedExam = state.exams.find((exam) => exam.id === selectedExamId) || state.exams[0];
  const selectedQuestions = selectedExam ? state.questions.filter((question) => question.examId === selectedExam.id) : [];
  const activeQuestion = examSession?.questions?.[questionIndex];

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function navigate(nextView) {
    setView(nextView);
    if (nextView === "newExam") {
      setExamForm(blankExam);
    }
  }

  function findExamByCode(code) {
    return state.exams.find((exam) => exam.classCode.toUpperCase() === code.trim().toUpperCase());
  }

  function handleCodeSubmit(event) {
    event.preventDefault();
    const exam = findExamByCode(activeCode);
    if (!exam) {
      flash("الكود غير موجود. جرّب MATH3A للبيانات التجريبية.");
      return;
    }
    setActiveCode(exam.classCode);
    setView("student");
  }

  function beginExam(studentInfo = student) {
    if (!activeExam) {
      flash("لم يتم العثور على الامتحان.");
      return;
    }

    if (!studentInfo.name.trim()) {
      flash("اكتب اسم الطالب أولا.");
      return;
    }
    if (!studentInfo.phone.trim()) {
      flash("اكتب رقم تليفون الطالب أولا.");
      return;
    }

    const questions = state.questions.filter((question) => question.examId === activeExam.id);
    const preparedQuestions = prepareExam(questions, studentInfo.name.trim(), activeExam.mode);
    window.sessionStorage.setItem(`student-${activeExam.classCode}`, JSON.stringify(studentInfo));
    setStudent(studentInfo);
    setExamSession({
      exam: activeExam,
      questions: preparedQuestions,
      startedAt: Date.now()
    });
    setAnswers({});
    setQuestionIndex(0);
    setRemainingSeconds(Number(activeExam.timeLimit) * 60);
    setView("start");
  }

  function updateAnswer(questionId, answer) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { answer }
    }));
  }

  function submitExam(auto = false) {
    if (!examSession) {
      return;
    }

    const normalizedAnswers = {};
    examSession.questions.forEach((question) => {
      const current = answers[question.id]?.answer;
      normalizedAnswers[question.id] = {
        answer: current ?? "",
        answerLabel: question.type === "mcq" ? question.options?.[current] : undefined,
        correctLabel: question.type === "mcq" ? question.options?.[question.correctAnswer] : undefined,
        isCorrect: question.type === "mcq" ? current === question.correctAnswer : null
      };
    });

    const mcqScore = gradeMCQ(examSession.questions, normalizedAnswers);
    const hasEssay = examSession.questions.some((question) => question.type === "essay");
    const totalMarks = examSession.questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
    const submission = {
      id: createId("sub"),
      examId: examSession.exam.id,
      studentName: student.name.trim(),
      studentPhone: student.phone.trim(),
      studentGrade: student.grade,
      classCode: examSession.exam.classCode,
      answers: normalizedAnswers,
      mcqScore,
      essayScore: hasEssay ? null : 0,
      totalScore: hasEssay ? null : mcqScore,
      totalMarks,
      status: hasEssay ? "submitted" : "graded",
      timeTaken: Number(examSession.exam.timeLimit) * 60 - remainingSeconds,
      submittedAt: new Date().toISOString(),
      gradedAt: hasEssay ? null : new Date().toISOString()
    };

    setState((current) => ({
      ...current,
      submissions: [submission, ...current.submissions]
    }));
    setExamSession({ ...examSession, submission });
    setView("result");
    flash(auto ? "انتهى الوقت وتم تسليم الامتحان تلقائيا." : "تم تسليم الامتحان بنجاح.");
  }

  function saveExam(event) {
    event.preventDefault();
    const classCodeValue = examForm.classCode.trim().toUpperCase();
    if (!examForm.title.trim() || !classCodeValue) {
      flash("العنوان وكود الامتحان مطلوبان.");
      return;
    }

    const exam = {
      ...examForm,
      id: examForm.id || createId("exam"),
      classCode: classCodeValue,
      timeLimit: Number(examForm.timeLimit),
      totalMarks: 0,
      questionsCount: 0,
      teacherId: "teacher-ahmed",
      createdAt: examForm.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState((current) => {
      const exists = current.exams.some((item) => item.id === exam.id);
      const exams = exists ? current.exams.map((item) => (item.id === exam.id ? exam : item)) : [exam, ...current.exams];
      return { ...current, exams };
    });
    setSelectedExamId(exam.id);
    setView("exams");
    flash("تم حفظ الامتحان.");
  }

  function editExam(exam) {
    setExamForm(exam);
    setView("newExam");
  }

  function deleteExam(examId) {
    setState((current) => ({
      exams: current.exams.filter((exam) => exam.id !== examId),
      questions: current.questions.filter((question) => question.examId !== examId),
      submissions: current.submissions.filter((submission) => submission.examId !== examId)
    }));
    flash("تم حذف الامتحان وبياناته.");
  }

  function saveQuestion(event) {
    event.preventDefault();
    const exam = selectedExam;
    if (!exam || !questionForm.text.trim()) {
      flash("اختر امتحان واكتب نص السؤال.");
      return;
    }

    const groupKey = questionForm.groupKey || String(selectedQuestions.length + 1);
    const groupQuestions = selectedQuestions.filter((item) => (item.groupKey || String(item.order)) === groupKey);
    const question = {
      ...questionForm,
      id: questionForm.id || createId("q"),
      examId: exam.id,
      marks: Number(questionForm.marks),
      groupKey,
      order: questionForm.order || groupQuestions[0]?.order || selectedQuestions.length + 1,
      variantOrder: questionForm.variantOrder || groupQuestions.length + 1,
      correctAnswer: Number(questionForm.correctAnswer)
    };

    setState((current) => {
      const exists = current.questions.some((item) => item.id === question.id);
      const questions = exists
        ? current.questions.map((item) => (item.id === question.id ? question : item))
        : [...current.questions, question];

      const exams = current.exams.map((item) => {
        if (item.id !== exam.id) {
          return item;
        }
        const examQuestions = questions.filter((itemQuestion) => itemQuestion.examId === exam.id);
        return {
          ...item,
          questionsCount: examQuestions.length,
          totalMarks: examQuestions.reduce((sum, itemQuestion) => sum + Number(itemQuestion.marks || 0), 0),
          updatedAt: new Date().toISOString()
        };
      });

      return { ...current, questions, exams };
    });
    setQuestionForm(blankQuestion);
    flash("تم حفظ السؤال.");
  }

  function readQuestionImage(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQuestionForm((current) => ({ ...current, imageData: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function editQuestion(question) {
    setQuestionForm({
      ...blankQuestion,
      ...question,
      options: question.options || ["", "", "", ""]
    });
  }

  function deleteQuestion(questionId) {
    setState((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.id !== questionId)
    }));
    flash("تم حذف السؤال.");
  }

  function gradeSubmission(submissionId) {
    const draft = Number(gradingDraft[submissionId] || 0);
    setState((current) => ({
      ...current,
      submissions: current.submissions.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              essayScore: draft,
              totalScore: submission.mcqScore + draft,
              status: "graded",
              gradedAt: new Date().toISOString()
            }
          : submission
      )
    }));
    flash("تم حفظ التصحيح.");
  }

  function resetDemo() {
    setState(resetState());
    setSelectedExamId("");
    flash("تمت استعادة البيانات التجريبية.");
  }

  const isDashboardMode = ["dashboard", "exams", "newExam", "results"].includes(initialView);

  return (
    <div className="app-shell">
      <Header isDashboard={isDashboardMode} view={view} navigate={navigate} />
      {notice ? <div className="toast" style={{ maxWidth: 1220, margin: "0 auto 18px" }}>{notice}</div> : null}

      {!isDashboardMode && view === "home" ? <Home activeCode={activeCode} setActiveCode={setActiveCode} onSubmit={handleCodeSubmit} /> : null}
      {!isDashboardMode && view === "login" ? <Login navigate={navigate} /> : null}
      {!isDashboardMode && view === "student" ? (
        <StudentEntry exam={activeExam} student={student} setStudent={setStudent} onStart={() => beginExam()} />
      ) : null}
      {!isDashboardMode && view === "start" ? (
        <StartExam
          activeQuestion={activeQuestion}
          answers={answers}
          currentIndex={questionIndex}
          examSession={examSession}
          onAnswer={updateAnswer}
          onMove={setQuestionIndex}
          onSubmit={() => submitExam(false)}
          remainingSeconds={remainingSeconds}
        />
      ) : null}
      {!isDashboardMode && view === "result" ? <Result examSession={examSession} state={state} activeCode={activeCode} /> : null}

      {isDashboardMode ? (
        <DashboardShell navigate={navigate}>
          {view === "dashboard" ? <Dashboard state={state} resetDemo={resetDemo} /> : null}
          {view === "exams" ? (
            <ExamManager
              deleteExam={deleteExam}
              editExam={editExam}
              editQuestion={editQuestion}
              questionForm={questionForm}
              saveQuestion={saveQuestion}
              selectedExam={selectedExam}
              selectedExamId={selectedExamId}
              selectedQuestions={selectedQuestions}
              setQuestionForm={setQuestionForm}
              readQuestionImage={readQuestionImage}
              setSelectedExamId={setSelectedExamId}
              state={state}
              deleteQuestion={deleteQuestion}
            />
          ) : null}
          {view === "newExam" ? <ExamForm examForm={examForm} saveExam={saveExam} setExamForm={setExamForm} /> : null}
          {view === "results" ? (
            <Results
              gradingDraft={gradingDraft}
              gradeSubmission={gradeSubmission}
              setGradingDraft={setGradingDraft}
              state={state}
            />
          ) : null}
        </DashboardShell>
      ) : null}
    </div>
  );
}

function Header({ isDashboard }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="الرئيسية">
        <img src="/logo.png" alt="يلا نفهم Math" />
        <span>
          <h1>منصة امتحانات أ/ أحمد سرور</h1>
          <p>رياضيات أونلاين بنظام عربي كامل</p>
        </span>
      </a>
      {isDashboard ? (
        <nav className="nav">
          <a className="btn secondary" href="/">دخول الطالب</a>
        </nav>
      ) : null}
    </header>
  );
}

function Home({ activeCode, setActiveCode, onSubmit }) {
  return (
    <main className="main-grid">
      <section className="panel">
        <h2 className="hero-title">ادخل كود الامتحان وابدأ الحل</h2>
        <p className="hero-copy">
          واجهة الطالب مصممة للرياضيات: مؤقت واضح، تنقل سريع بين الأسئلة، اختيار من متعدد يتصحح تلقائيا، ومقالي ينتظر تصحيح المدرس.
        </p>
        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="classCode">كود الامتحان</label>
            <input
              className="input"
              id="classCode"
              onChange={(event) => setActiveCode(event.target.value.toUpperCase())}
              placeholder="مثال: MATH3A"
              value={activeCode}
            />
          </div>
          <button className="btn primary" type="submit">فتح الامتحان</button>
        </form>
      </section>
      <aside className="panel logo-card">
        <img src="/logo.png" alt="شعار يلا نفهم Math" />
      </aside>
    </main>
  );
}

function Login({ navigate }) {
  return (
    <main className="main-grid">
      <section className="panel">
        <div className="section-title">
          <h2>تسجيل دخول المدرس</h2>
          <span className="pill">جاهز لربط Firebase Auth</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input className="input" defaultValue="ahmed@ahmed-srour.com" />
          </div>
          <div className="field">
            <label>كلمة المرور</label>
            <input className="input" type="password" defaultValue="12345678" />
          </div>
          <button className="btn primary full" onClick={() => navigate("dashboard")} type="button">دخول لوحة التحكم</button>
        </div>
      </section>
      <section className="panel">
        <h3>ملاحظة التنفيذ</h3>
        <p className="hero-copy">هذه النسخة تعمل محليا ببيانات تجريبية. عند إضافة مفاتيح Firebase سيتم استخدام ملفات الربط الموجودة في `src/lib`.</p>
      </section>
    </main>
  );
}

function StudentEntry({ exam, student, setStudent, onStart }) {
  if (!exam) {
    return (
      <main className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2>الكود غير موجود</h2>
        <p className="muted">ارجع للصفحة الرئيسية واكتب كود امتحان صحيح.</p>
      </main>
    );
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="section-title">
          <h2>{exam.title}</h2>
          <span className="pill green">{exam.status === "active" ? "متاح الآن" : "غير متاح"}</span>
        </div>
        <div className="stats">
          <div className="card stat"><span className="muted">الوقت</span><strong>{exam.timeLimit}</strong><span>دقيقة</span></div>
          <div className="card stat"><span className="muted">الأسئلة</span><strong>{exam.questionsCount}</strong><span>سؤال</span></div>
          <div className="card stat"><span className="muted">الدرجات</span><strong>{exam.totalMarks}</strong><span>درجة</span></div>
          <div className="card stat"><span className="muted">الوضع</span><strong>{exam.mode === "random" ? "عشوائي" : "ثابت"}</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="stack">
          <div className="field">
            <label>اسم الطالب</label>
            <input className="input" onChange={(event) => setStudent({ ...student, name: event.target.value })} value={student.name} />
          </div>
          <div className="field">
            <label>رقم تليفون الطالب</label>
            <input className="input" inputMode="tel" onChange={(event) => setStudent({ ...student, phone: event.target.value })} value={student.phone} />
          </div>
          <div className="field">
            <label>الصف</label>
            <input className="input" onChange={(event) => setStudent({ ...student, grade: event.target.value })} value={student.grade} />
          </div>
          <button className="btn primary" onClick={onStart} type="button">بدء الامتحان</button>
        </div>
      </section>
    </main>
  );
}

function StartExam({ activeQuestion, answers, currentIndex, examSession, onAnswer, onMove, onSubmit, remainingSeconds }) {
  if (!examSession || !activeQuestion) {
    return <main className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>جاري تجهيز الامتحان...</main>;
  }

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  const answered = answeredCount(examSession.questions, answers);

  return (
    <main className="student-layout">
      <section className="panel">
        <div className="section-title">
          <h2>السؤال {currentIndex + 1}</h2>
          <span className="pill">{activeQuestion.marks} درجات</span>
        </div>
        <p className="hero-copy" style={{ marginBottom: 8 }}>{activeQuestion.text}</p>
        {activeQuestion.imageData ? <figure className="question-image"><img src={activeQuestion.imageData} alt="صورة السؤال" /></figure> : null}
        {activeQuestion.imageText ? <div className="equation-card">{activeQuestion.imageText}</div> : null}
        {activeQuestion.type === "mcq" ? (
          <div>
            {activeQuestion.options.map((option, index) => (
              <button
                className={`option ${answers[activeQuestion.id]?.answer === index ? "selected" : ""}`}
                key={option}
                onClick={() => onAnswer(activeQuestion.id, index)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="textarea"
            onChange={(event) => onAnswer(activeQuestion.id, event.target.value)}
            placeholder="اكتب إجابتك هنا"
            value={answers[activeQuestion.id]?.answer || ""}
          />
        )}
        <div className="split" style={{ marginTop: 18 }}>
          <button className="btn secondary" disabled={currentIndex === 0} onClick={() => onMove(Math.max(0, currentIndex - 1))} type="button">السابق</button>
          <button className="btn secondary" disabled={currentIndex === examSession.questions.length - 1} onClick={() => onMove(Math.min(examSession.questions.length - 1, currentIndex + 1))} type="button">التالي</button>
          {currentIndex === examSession.questions.length - 1 ? (
            <button className="btn primary" onClick={onSubmit} type="button">تسليم الامتحان</button>
          ) : null}
        </div>
      </section>
      <aside className="panel stack">
        <div className="card stat">
          <span className="muted">الوقت المتبقي</span>
          <strong>{minutes}:{seconds}</strong>
        </div>
        <div className="card">
          <strong>تمت الإجابة على {answered} من {examSession.questions.length}</strong>
        </div>
        <div className="question-nav">
          {examSession.questions.map((question, index) => (
            <button
              className={`nav-dot ${answers[question.id]?.answer !== undefined && answers[question.id]?.answer !== "" ? "answered" : ""} ${index === currentIndex ? "active" : ""}`}
              key={question.id}
              onClick={() => onMove(index)}
              type="button"
            >
              {index + 1}
            </button>
          ))}
        </div>
      </aside>
    </main>
  );
}

function Result({ examSession, state, activeCode }) {
  const submission = examSession?.submission || state.submissions.find((item) => item.classCode === activeCode);
  if (!submission) {
    return <main className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>لا توجد نتيجة محفوظة لهذا الامتحان.</main>;
  }

  return (
    <main className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="section-title">
        <h2>نتيجة الطالب</h2>
        <span className={`pill ${submission.status === "graded" ? "green" : ""}`}>{submission.status === "graded" ? "تم التصحيح" : "في انتظار تصحيح المقالي"}</span>
      </div>
      <div className="stats">
        <div className="card stat"><span className="muted">MCQ</span><strong>{submission.mcqScore}</strong></div>
        <div className="card stat"><span className="muted">المقالي</span><strong>{submission.essayScore ?? "..."}</strong></div>
        <div className="card stat"><span className="muted">المجموع</span><strong>{submission.totalScore ?? "..."}</strong></div>
        <div className="card stat"><span className="muted">من</span><strong>{submission.totalMarks}</strong></div>
      </div>
    </main>
  );
}

function DashboardShell({ children, navigate }) {
  return (
    <main className="dashboard-grid">
      <aside className="sidebar">
        <button className="btn secondary" onClick={() => navigate("dashboard")} type="button">الرئيسية</button>
        <button className="btn secondary" onClick={() => navigate("exams")} type="button">الامتحانات والأسئلة</button>
        <button className="btn secondary" onClick={() => navigate("newExam")} type="button">إنشاء امتحان</button>
        <button className="btn secondary" onClick={() => navigate("results")} type="button">النتائج والتصحيح</button>
      </aside>
      <section className="stack">{children}</section>
    </main>
  );
}

function Dashboard({ state, resetDemo }) {
  const activeExams = state.exams.filter((exam) => exam.status === "active").length;
  const graded = state.submissions.filter((submission) => submission.status === "graded");
  const avg = graded.length ? Math.round(graded.reduce((sum, submission) => sum + submission.totalScore, 0) / graded.length) : 0;

  return (
    <section className="panel">
      <div className="section-title">
        <h2>إحصائيات عامة</h2>
        <button className="btn secondary" onClick={resetDemo} type="button">استعادة الديمو</button>
      </div>
      <div className="stats">
        <div className="card stat"><span className="muted">كل الامتحانات</span><strong>{state.exams.length}</strong></div>
        <div className="card stat"><span className="muted">نشط الآن</span><strong>{activeExams}</strong></div>
        <div className="card stat"><span className="muted">التسليمات</span><strong>{state.submissions.length}</strong></div>
        <div className="card stat"><span className="muted">متوسط المصحح</span><strong>{avg}</strong></div>
      </div>
    </section>
  );
}

function ExamForm({ examForm, saveExam, setExamForm }) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>{examForm.id ? "تعديل امتحان" : "إنشاء امتحان جديد"}</h2>
      </div>
      <form className="form-grid" onSubmit={saveExam}>
        <Field label="عنوان الامتحان" value={examForm.title} onChange={(value) => setExamForm({ ...examForm, title: value })} />
        <Field label="كود الامتحان" value={examForm.classCode} onChange={(value) => setExamForm({ ...examForm, classCode: value.toUpperCase() })} />
        <Field label="المادة" value={examForm.subject} onChange={(value) => setExamForm({ ...examForm, subject: value })} />
        <Field label="الصف" value={examForm.grade} onChange={(value) => setExamForm({ ...examForm, grade: value })} />
        <Field label="الوقت بالدقائق" type="number" value={examForm.timeLimit} onChange={(value) => setExamForm({ ...examForm, timeLimit: value })} />
        <div className="field">
          <label>الوضع</label>
          <select className="select" value={examForm.mode} onChange={(event) => setExamForm({ ...examForm, mode: event.target.value })}>
            <option value="fixed">ثابت</option>
            <option value="random">عشوائي</option>
          </select>
        </div>
        <div className="field">
          <label>الحالة</label>
          <select className="select" value={examForm.status} onChange={(event) => setExamForm({ ...examForm, status: event.target.value })}>
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="closed">مغلق</option>
          </select>
        </div>
        <Field label="تاريخ الفتح" type="datetime-local" value={examForm.openDate} onChange={(value) => setExamForm({ ...examForm, openDate: value })} />
        <Field label="تاريخ الإغلاق" type="datetime-local" value={examForm.closeDate} onChange={(value) => setExamForm({ ...examForm, closeDate: value })} />
        <button className="btn primary full" type="submit">حفظ الامتحان</button>
      </form>
    </section>
  );
}

function ExamManager(props) {
  const {
    deleteExam,
    deleteQuestion,
    editExam,
    editQuestion,
    questionForm,
    readQuestionImage,
    saveQuestion,
    selectedExam,
    selectedExamId,
    selectedQuestions,
    setQuestionForm,
    setSelectedExamId,
    state
  } = props;

  return (
    <>
      <section className="panel">
        <div className="section-title">
          <h2>الامتحانات</h2>
          <span className="pill">{state.exams.length} امتحان</span>
        </div>
        <div className="list">
          {state.exams.map((exam) => (
            <article className="exam-row" key={exam.id}>
              <div>
                <strong>{exam.title}</strong>
                <p className="muted">{exam.grade} | الكود: {exam.classCode} | {exam.questionsCount} سؤال | {exam.totalMarks} درجة</p>
              </div>
              <div className="split">
                <button className="btn secondary" onClick={() => setSelectedExamId(exam.id)} type="button">الأسئلة</button>
                <button className="btn secondary" onClick={() => editExam(exam)} type="button">تعديل</button>
                <button className="btn danger" onClick={() => deleteExam(exam.id)} type="button">حذف</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>إدارة الأسئلة</h2>
          <select className="select" style={{ maxWidth: 280 }} value={selectedExamId || selectedExam?.id || ""} onChange={(event) => setSelectedExamId(event.target.value)}>
            {state.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
          </select>
        </div>
        <form className="form-grid" onSubmit={saveQuestion}>
          <div className="field">
            <label>نوع السؤال</label>
            <select className="select" value={questionForm.type} onChange={(event) => setQuestionForm({ ...questionForm, type: event.target.value })}>
              <option value="mcq">اختيار من متعدد</option>
              <option value="essay">مقالي</option>
            </select>
          </div>
          <Field label="الدرجة" type="number" value={questionForm.marks} onChange={(value) => setQuestionForm({ ...questionForm, marks: value })} />
          <Field label="مجموعة السؤال المكافئ" value={questionForm.groupKey} onChange={(value) => setQuestionForm({ ...questionForm, groupKey: value })} />
          <div className="field full">
            <label>نص السؤال</label>
            <textarea className="textarea" value={questionForm.text} onChange={(event) => setQuestionForm({ ...questionForm, text: event.target.value })} />
          </div>
          <Field className="full" label="نص المعادلة أو وصف الصورة" value={questionForm.imageText} onChange={(value) => setQuestionForm({ ...questionForm, imageText: value })} />
          <div className="field full">
            <label>صورة السؤال</label>
            <div className="upload-box">
              <input className="input" accept="image/*" onChange={(event) => readQuestionImage(event.target.files?.[0])} type="file" />
              {questionForm.imageData ? <div className="image-preview"><img src={questionForm.imageData} alt="معاينة صورة السؤال" /></div> : null}
            </div>
          </div>
          {questionForm.type === "mcq" ? (
            <>
              {questionForm.options.map((option, index) => (
                <Field
                  key={index}
                  label={`اختيار ${index + 1}`}
                  value={option}
                  onChange={(value) => {
                    const options = [...questionForm.options];
                    options[index] = value;
                    setQuestionForm({ ...questionForm, options });
                  }}
                />
              ))}
              <div className="field">
                <label>الإجابة الصحيحة</label>
                <select className="select" value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value })}>
                  {questionForm.options.map((_, index) => <option key={index} value={index}>اختيار {index + 1}</option>)}
                </select>
              </div>
            </>
          ) : null}
          <button className="btn primary full" type="submit">حفظ السؤال</button>
        </form>
        <div className="list" style={{ marginTop: 18 }}>
          {selectedQuestions.map((question) => (
            <article className="question-row" key={question.id}>
              <div>
                <strong>مجموعة {question.groupKey || question.order}: {question.text || "سؤال بصورة فقط"}</strong>
                <p className="muted">{question.type === "mcq" ? "اختيار من متعدد" : "مقالي"} | {question.marks} درجات {question.imageData ? "| يحتوي على صورة" : ""}</p>
                {question.imageData ? <img className="thumb" src={question.imageData} alt="صورة السؤال" /> : null}
              </div>
              <div className="split">
                <button className="btn secondary" onClick={() => editQuestion(question)} type="button">تعديل</button>
                <button className="btn danger" onClick={() => deleteQuestion(question.id)} type="button">حذف</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Results({ gradingDraft, gradeSubmission, setGradingDraft, state }) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(state.submissions[0]?.id || "");
  const selectedSubmission = state.submissions.find((submission) => submission.id === selectedSubmissionId) || state.submissions[0];

  return (
    <>
      <section className="panel admin-panel">
        <div className="section-title">
          <h2>النتائج والتصحيح</h2>
          <button className="btn gold" onClick={() => exportSubmissionsCsv(state.exams, state.submissions)} type="button">تصدير CSV</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>التليفون</th>
                <th>الامتحان</th>
                <th>MCQ</th>
                <th>المقالي</th>
                <th>المجموع</th>
                <th>الحالة</th>
                <th>الإجابات</th>
                <th>تصحيح</th>
              </tr>
            </thead>
            <tbody>
              {state.submissions.map((submission) => {
                const exam = state.exams.find((item) => item.id === submission.examId);
                return (
                  <tr key={submission.id}>
                    <td>{submission.studentName}<br /><span className="muted">{submission.studentGrade}</span></td>
                    <td>{submission.studentPhone || "—"}</td>
                    <td>{exam?.title || submission.classCode}</td>
                    <td>{submission.mcqScore}</td>
                    <td>{submission.essayScore ?? "في الانتظار"}</td>
                    <td>{submission.totalScore ?? "غير مكتمل"}</td>
                    <td><span className={`pill ${submission.status === "graded" ? "green" : "red"}`}>{submission.status === "graded" ? "تم التصحيح" : "يحتاج تصحيح"}</span></td>
                    <td><button className="btn secondary" onClick={() => setSelectedSubmissionId(submission.id)} type="button">عرض</button></td>
                    <td>
                      {submission.status !== "graded" ? (
                        <div className="split">
                          <input className="input" style={{ width: 90 }} type="number" value={gradingDraft[submission.id] || ""} onChange={(event) => setGradingDraft({ ...gradingDraft, [submission.id]: event.target.value })} />
                          <button className="btn secondary" onClick={() => gradeSubmission(submission.id)} type="button">حفظ</button>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {selectedSubmission ? <AnswerReview state={state} submission={selectedSubmission} /> : null}
    </>
  );
}

function AnswerReview({ state, submission }) {
  const exam = state.exams.find((item) => item.id === submission.examId);
  const questions = state.questions.filter((question) => question.examId === submission.examId).sort((a, b) => a.order - b.order);

  return (
    <section className="panel admin-panel answer-review">
      <div className="section-title">
        <div>
          <h2>إجابات {submission.studentName}</h2>
          <p className="muted">{submission.studentPhone || "بدون رقم"} | {exam?.title || submission.classCode}</p>
        </div>
      </div>
      <div className="answers-grid">
        {questions.map((question) => {
          const answer = submission.answers?.[question.id];
          return (
            <article className="answer-card" key={question.id}>
              <strong>سؤال {question.order}</strong>
              <p>{question.text || "سؤال بصورة فقط"}</p>
              {question.imageData ? <figure className="question-image"><img src={question.imageData} alt="صورة السؤال" /></figure> : null}
              {question.imageText ? <div className="equation-card">{question.imageText}</div> : null}
              <div className="answer-line"><span>إجابة الطالب</span><strong>{answer?.answerLabel || answer?.answer || "لم يجب"}</strong></div>
              <div className="answer-line"><span>الإجابة الصحيحة</span><strong>{answer?.correctLabel || (question.type === "mcq" ? question.options?.[question.correctAnswer] : "تصحيح يدوي")}</strong></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Field({ className = "", label, onChange, type = "text", value }) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      <input className="input" type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
