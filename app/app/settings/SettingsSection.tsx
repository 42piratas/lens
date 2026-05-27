import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  multi?: boolean;
  children: ReactNode;
};

export function SettingsSection({ id, title, multi, children }: Props) {
  const headingId = `settings-${id}-heading`;
  return (
    <section
      className="lens-card-chrome"
      data-static="true"
      data-multi={multi ? "true" : undefined}
      aria-labelledby={headingId}
    >
      <div className="lens-card-topbar">
        <span className="lens-card-topbar-label-wrap">
          <span id={headingId} className="lens-card-topbar-label">
            {title}
          </span>
        </span>
      </div>
      <div className="lens-card-body">{children}</div>
    </section>
  );
}
