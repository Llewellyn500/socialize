import { getMediaIcon } from "@/lib/media-icons";

type MediaIconProps = {
  id: string;
  className?: string;
};

export function MediaIcon({ id, className }: MediaIconProps) {
  const entry = getMediaIcon(id);
  if (!entry) return null;
  const Icon = entry.Icon;
  return <Icon aria-hidden="true" className={className} />;
}
