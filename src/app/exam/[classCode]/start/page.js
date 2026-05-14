import ExamPlatform from "@/components/ExamPlatform";

export default function ExamStartPage({ params }) {
  return <ExamPlatform initialView="start" classCode={params.classCode} />;
}
