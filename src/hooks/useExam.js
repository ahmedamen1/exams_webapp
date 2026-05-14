"use client";

import { loadState } from "@/lib/store";

export function useExam(classCode) {
  const state = loadState();
  const exam = state.exams.find((item) => item.classCode.toUpperCase() === classCode?.toUpperCase());
  return {
    exam,
    questions: exam ? state.questions.filter((question) => question.examId === exam.id) : []
  };
}
