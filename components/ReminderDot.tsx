/*
 * Красная пульсирующая точка. Родитель должен иметь className="relative".
 * Позицию можно менять через className, например "-right-1 -top-1".
 */
export default function ReminderDot({
  className = "-right-0.5 -top-0.5",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute flex h-2.5 w-2.5 ${className}`}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}