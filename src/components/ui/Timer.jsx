export default function Timer({ seconds }) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return <strong>{minutes}:{rest}</strong>;
}
