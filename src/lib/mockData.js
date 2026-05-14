export const sampleState = {
  exams: [
    {
      id: "exam-1",
      teacherId: "teacher-ahmed",
      title: "امتحان الباب الأول — تفاضل",
      subject: "رياضيات",
      grade: "الثالث الثانوي",
      classCode: "MATH3A",
      timeLimit: 45,
      mode: "random",
      status: "active",
      openDate: "2026-05-14T16:00",
      closeDate: "2026-05-21T22:00",
      totalMarks: 30,
      questionsCount: 4,
      createdAt: "2026-05-14T16:00",
      updatedAt: "2026-05-14T16:00"
    }
  ],
  questions: [
    {
      id: "q-1",
      examId: "exam-1",
      type: "mcq",
      text: "إذا كانت ص = ٣س² + ٢س، فما قيمة صَ؟",
      imageText: "ص = ٣س² + ٢س",
      marks: 5,
      order: 1,
      groupKey: "1",
      options: ["٦س + ٢", "٣س + ٢", "٦س² + ٢", "س² + ٢"],
      correctAnswer: 0
    },
    {
      id: "q-2",
      examId: "exam-1",
      type: "mcq",
      text: "ناتج تكامل ٢س بالنسبة إلى س يساوي:",
      imageText: "∫ ٢س د س",
      marks: 5,
      order: 2,
      groupKey: "2",
      options: ["س² + ج", "٢س² + ج", "س + ج", "٢ + ج"],
      correctAnswer: 0
    },
    {
      id: "q-3",
      examId: "exam-1",
      type: "mcq",
      text: "إذا كان ميل المماس عند نقطة يساوي صفر، فالنقطة غالبا:",
      marks: 5,
      order: 3,
      groupKey: "3",
      options: ["حرجة", "غير معرفة", "بداية المجال", "نهاية المجال"],
      correctAnswer: 0
    },
    {
      id: "q-4",
      examId: "exam-1",
      type: "essay",
      text: "أوجد مشتقة الدالة التالية مع توضيح خطوات الحل.",
      imageText: "ص = (س² + ١)(٣س - ٢)",
      marks: 15,
      order: 4,
      groupKey: "4"
    }
  ],
  submissions: [
    {
      id: "sub-1",
      examId: "exam-1",
      studentName: "محمد أحمد",
      studentPhone: "01012345678",
      studentGrade: "3ث",
      classCode: "MATH3A",
      answers: {
        "q-1": { answer: 0, isCorrect: true },
        "q-2": { answer: 0, isCorrect: true },
        "q-3": { answer: 2, isCorrect: false },
        "q-4": { answer: "باستخدام قاعدة الضرب: صَ = ٢س(٣س - ٢) + ٣(س² + ١)" }
      },
      mcqScore: 10,
      essayScore: null,
      totalScore: null,
      totalMarks: 30,
      status: "submitted",
      timeTaken: 1220,
      submittedAt: "2026-05-14T17:30",
      gradedAt: null
    }
  ]
};

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}
