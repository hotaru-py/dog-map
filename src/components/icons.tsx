/** Small stroke icon set (24px grid). Use sparingly: labels first, icons where they add meaning. */

type IconProps = { className?: string };

function Svg({
  className = "h-4 w-4",
  children,
  filled,
}: IconProps & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const PawIcon = (p: IconProps) => (
  <Svg {...p} filled>
    <ellipse cx="5" cy="10" rx="2.1" ry="2.6" transform="rotate(-20 5 10)" />
    <ellipse cx="9.2" cy="5.6" rx="2.1" ry="2.7" transform="rotate(-6 9.2 5.6)" />
    <ellipse cx="14.8" cy="5.6" rx="2.1" ry="2.7" transform="rotate(6 14.8 5.6)" />
    <ellipse cx="19" cy="10" rx="2.1" ry="2.6" transform="rotate(20 19 10)" />
    <path d="M12 11.2c-3 0-6.2 3.6-6.2 6.4 0 1.8 1.4 2.9 3.1 2.9 1.2 0 2-.6 3.1-.6s1.9.6 3.1.6c1.7 0 3.1-1.1 3.1-2.9 0-2.8-3.2-6.4-6.2-6.4Z" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const StarIcon = (p: IconProps) => (
  <Svg {...p} filled>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} filled={filled}>
    <path d="M12 20.5s-7.5-4.6-9.5-9.3C1.1 7.8 3.4 4 7.2 4c2.1 0 3.5 1.2 4.8 2.8C13.3 5.2 14.7 4 16.8 4c3.8 0 6.1 3.8 4.7 7.2-2 4.7-9.5 9.3-9.5 9.3Z" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);

export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

/** Brand mark: paw on an orange tile. */
export function Logo({ className = "h-11 w-11" }: IconProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-600/30 ${className}`}
    >
      <PawIcon className="h-[55%] w-[55%]" />
    </span>
  );
}
