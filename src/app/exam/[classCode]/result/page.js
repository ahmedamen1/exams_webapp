import ExamPlatform from "@/components/ExamPlatform";

export default function ExamResultPage({ params }) {
  return <ExamPlatform initialView="result" classCode={params.classCode} />;
}
