import {
  Activity, AlertTriangle, ArrowUpDown, BarChart2, Battery, Bell, Bluetooth,
  Check, CircleDot, Cloud, Coffee, Compass, Copy, Cpu, Fan, FileText,
  FilePlus, Fingerprint, FolderOpen, Hash, Home, Info, Leaf, Link, List,
  Lock, Lightbulb, Mic, Monitor, Moon, Music, Palette, Plug, Power,
  Radar, Radio, RefreshCw, Ruler, Save, Scale, Settings, Shield, SlidersHorizontal,
  Smartphone, Snowflake, Sun, SunDim, Thermometer, Timer, Trash2, Tv,
  Undo2, Redo2, User, Volume2, Wifi, Wind, Wrench, XCircle, Zap,
  MousePointerClick, type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Activity, AlertTriangle, ArrowUpDown, BarChart2, Battery, Bell, Bluetooth,
  Check, CircleDot, Cloud, Coffee, Compass, Copy, Cpu, Fan, FileText,
  FilePlus, Fingerprint, FolderOpen, Hash, Home, Info, Leaf, Link, List,
  Lock, Lightbulb, Mic, Monitor, Moon, Music, Palette, Plug, Power,
  Radar, Radio, RefreshCw, Ruler, Save, Scale, Settings, Shield, SlidersHorizontal,
  Smartphone, Snowflake, Sun, SunDim, Thermometer, Timer, Trash2, Tv,
  Undo2, Redo2, User, Volume2, Wifi, Wind, Wrench, XCircle, Zap,
  MousePointerClick,
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, strokeWidth }: IconProps) {
  const Comp = iconMap[name];
  if (!Comp) return null;
  return <Comp size={size} className={className} strokeWidth={strokeWidth} />;
}
