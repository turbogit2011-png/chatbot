import {
  Gauge,
  Volume2,
  CloudFog,
  Fuel,
  Timer,
  Droplets,
  TriangleAlert,
  Activity,
  Wrench,
  Ruler,
  Cog,
  Disc3,
  Wind,
  SlidersHorizontal,
  FileCheck,
  Percent,
  CalendarClock,
  ScanLine,
  type LucideProps,
} from "lucide-react";

const REGISTRY = {
  Gauge,
  Volume2,
  CloudFog,
  Fuel,
  Timer,
  Droplets,
  TriangleAlert,
  Activity,
  Wrench,
  Ruler,
  Cog,
  Disc3,
  Wind,
  SlidersHorizontal,
  FileCheck,
  Percent,
  CalendarClock,
  ScanLine,
} as const;

export type IconName = keyof typeof REGISTRY;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = REGISTRY[name as IconName] ?? Gauge;
  return <Cmp {...props} />;
}
