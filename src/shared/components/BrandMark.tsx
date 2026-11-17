interface BrandMarkProps {
  /** Cạnh của biểu tượng, tính bằng px. */
  size?: number;
  /** Hiện chữ "GreyTest" bên cạnh biểu tượng. */
  withWordmark?: boolean;
  className?: string;
  /** Ẩn với trình đọc màn hình khi bên cạnh đã có chữ "GreyTest". */
  decorative?: boolean;
}

/**
 * Logo GreyTest: chữ G là một đường truy vết đi qua ba điểm Business Rule, Test Case và Unit Test.
 * Dưới 20px dùng bản rút gọn hai chấm, nét dày hơn để không bị nhoè.
 */
export function BrandMark({ size = 28, withWordmark = false, className = '', decorative = false }: BrandMarkProps) {
  const compact = size < 20;
  const hidden = withWordmark || decorative;
  const stroke = compact ? 6 : size < 40 ? 4.2 : 3.5;
  const radius = compact ? 6 : size < 40 ? 4.4 : 3.6;
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden={hidden ? true : undefined}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : 'GreyTest'}
      className="shrink-0"
    >
      <path
        d="M35.3 12.7A16 16 0 1 0 40 24H27"
        className="stroke-heading"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35.3" cy="12.7" r={radius} style={{ fill: 'var(--accent)' }} />
      {!compact && <circle cx="8" cy="24" r={radius} style={{ fill: 'var(--accent)' }} />}
      <circle cx="27" cy="24" r={radius} style={{ fill: 'var(--accent)' }} />
    </svg>
  );
  if (!withWordmark) return mark;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="font-display text-lg font-semibold tracking-tight text-heading">GreyTest</span>
    </span>
  );
}
