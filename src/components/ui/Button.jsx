export default function Button({ children, className = "", variant = "secondary", ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}
