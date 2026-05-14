import ExamPlatform from "@/components/ExamPlatform";

export default function StudentEntryPage({ params }) {
  return <ExamPlatform initialView="student" classCode={params.classCode} />;
}
