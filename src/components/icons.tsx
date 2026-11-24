/** Stroke icon set on a 24px grid, plus the dog symbol and the Pawpass logo mark. */

type P = { className?: string };

function S({ className = "h-5 w-5", children, fill }: P & { children: React.ReactNode; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h10" /></S>;
export const SearchIcon = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const EyeIcon = (p: P) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></S>;
export const MapIcon = (p: P) => <S {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" /></S>;
export const BookIcon = (p: P) => <S {...p}><path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h14" /></S>;
export const ImageIcon = (p: P) => <S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5L5 20" /></S>;
export const UserIcon = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>;
export const UsersIcon = (p: P) => <S {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></S>;
export const XIcon = (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>;
export const NavIcon = (p: P) => <S {...p} fill><path d="M12 2.5 19.5 21 12 16.8 4.5 21Z" /></S>;
export const CheckIcon = (p: P) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>;
export const ClockIcon = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const CameraIcon = (p: P) => <S {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" /><circle cx="12" cy="13" r="3.5" /></S>;
export const FlameIcon = (p: P) => <S {...p} fill><path d="M12 2.5c.8 3.8 5.5 5.3 5.5 10.6a5.5 5.5 0 0 1-11 0c0-2.9 1.8-4.2 2.3-6.3 1.3 1 2 2.6 2 4.1 1.4-2 1.6-5.3 1.2-8.4Z" /></S>;
export const ChevronIcon = (p: P) => <S {...p}><path d="m9 6 6 6-6 6" /></S>;
export const ChevronLeftIcon = (p: P) => <S {...p}><path d="m15 6-6 6 6 6" /></S>;
export const PlusIcon = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const MinusIcon = (p: P) => <S {...p}><path d="M5 12h14" /></S>;
export const PinIcon = (p: P) => <S {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></S>;
export const LayersIcon = (p: P) => <S {...p}><path d="M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5" /></S>;
export const CubeIcon = (p: P) => <S {...p}><path d="M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10" /></S>;
export const SlidersIcon = (p: P) => <S {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></S>;
export const ShieldIcon = (p: P) => <S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></S>;
export const AlertIcon = (p: P) => <S {...p}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></S>;
export const ListIcon = (p: P) => <S {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></S>;
export const InboxIcon = (p: P) => <S {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" /></S>;
export const ExternalIcon = (p: P) => <S {...p}><path d="M14 4h6v6M10 14 20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></S>;
export const TargetIcon = (p: P) => <S {...p}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></S>;
export const HomeIcon = (p: P) => <S {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></S>;
export const TrophyIcon = (p: P) => <S {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></S>;
export const LogOutIcon = (p: P) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>;
export const RefreshIcon = (p: P) => <S {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></S>;
export const HeartPulseIcon = (p: P) => <S {...p}><path d="M12 20.5s-7.5-4.6-9.5-9.3C1.1 7.8 3.4 4 7.2 4c2.1 0 3.5 1.2 4.8 2.8C13.3 5.2 14.7 4 16.8 4c3.8 0 6.1 3.8 4.7 7.2-2 4.7-9.5 9.3-9.5 9.3Z" /></S>;

const PAW_SHAPES = (
  <>
    <ellipse cx="5" cy="10" rx="2.1" ry="2.6" transform="rotate(-20 5 10)" />
    <ellipse cx="9.2" cy="5.6" rx="2.1" ry="2.7" transform="rotate(-6 9.2 5.6)" />
    <ellipse cx="14.8" cy="5.6" rx="2.1" ry="2.7" transform="rotate(6 14.8 5.6)" />
    <ellipse cx="19" cy="10" rx="2.1" ry="2.6" transform="rotate(20 19 10)" />
    <path d="M12 11.2c-3 0-6.2 3.6-6.2 6.4 0 1.8 1.4 2.9 3.1 2.9 1.2 0 2-.6 3.1-.6s1.9.6 3.1.6c1.7 0 3.1-1.1 3.1-2.9 0-2.8-3.2-6.4-6.2-6.4Z" />
  </>
);

export const PawIcon = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    {PAW_SHAPES}
  </svg>
);

/** Dog head silhouette (also the source shape for the 3D tokens in Navigate mode). */
export const DOG_SILHOUETTE_PATHS = [
  "M21 17Q12 12 8 20Q5 30 10 38Q14 40 16 33Q17 24 21 17Z",
  "M43 17Q52 12 56 20Q59 30 54 38Q50 40 48 33Q47 24 43 17Z",
  "M20 18Q32 9 44 18Q50 24 49 36Q48 51 32 55Q16 51 15 36Q14 24 20 18Z",
];

export function DogGlyph({ className = "h-6 w-6", face = true }: P & { face?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {DOG_SILHOUETTE_PATHS.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
      {face && (
        <g>
          <ellipse cx="32" cy="43" rx="10" ry="8" fill="#fff" opacity=".88" />
          <circle cx="25" cy="31" r="2.8" fill="#15141F" />
          <circle cx="39" cy="31" r="2.8" fill="#15141F" />
          <ellipse cx="32" cy="39" rx="4" ry="2.8" fill="#15141F" />
          <path d="M32 41.5v3M28.5 45.5q3.5 2.2 7 0" stroke="#15141F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/** The Pawpass ticket mark, outlined in Trailhead ink. */
export function Logo({ className = "h-10 w-11" }: P) {
  return (
    <svg viewBox="0 0 50 46" className={className} role="img" aria-label="SNUC Dog Tracker">
      <path
        d="M6 6h38a3 3 0 0 1 3 3v8a6 6 0 0 0 0 12v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a6 6 0 0 0 0-12V9a3 3 0 0 1 3-3Z"
        fill="#FFC83D"
        stroke="#13261F"
        strokeWidth="2.5"
      />
      <g transform="translate(13 11)" fill="#13261F">
        {PAW_SHAPES}
      </g>
    </svg>
  );
}
