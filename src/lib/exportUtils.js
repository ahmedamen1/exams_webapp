export function exportSubmissionsCsv(exams, submissions) {
  const rows = [
    ["اسم الطالب", "التليفون", "الصف", "الامتحان", "كود الامتحان", "درجة MCQ", "المقالي", "المجموع", "الحالة", "تاريخ التسليم"],
    ...submissions.map((submission) => {
      const exam = exams.find((item) => item.id === submission.examId);
      return [
        submission.studentName,
        submission.studentPhone || "",
        submission.studentGrade,
        exam?.title || "",
        submission.classCode,
        submission.mcqScore,
        submission.essayScore ?? "في انتظار التصحيح",
        submission.totalScore ?? "غير مكتمل",
        submission.status === "graded" ? "تم التصحيح" : "تم التسليم",
        submission.submittedAt
      ];
    })
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exam-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}
