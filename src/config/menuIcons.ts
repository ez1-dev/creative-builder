import {
  Home, Package, Users, Settings, Factory, ShoppingCart, Warehouse, Landmark,
  Receipt, BarChart3, Boxes, ShieldAlert, FileText, Cog, LayoutDashboard, Database,
  Search, Star, Heart, Bell, Calendar, ClipboardList, Folder, FolderOpen, Layers,
  Link as LinkIcon, ExternalLink, Globe, Briefcase, Building, Building2, Truck,
  Wrench, Hammer, Zap, Activity, TrendingUp, PieChart, LineChart, DollarSign,
  CreditCard, Wallet, Percent, Tag, Tags, Bookmark, Flag, Award, Trophy,
  Mail, MessageSquare, Phone, User, UserCheck, UserPlus, UserCog, ShieldCheck,
  Lock, Unlock, Key, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, AlertCircle,
  Info, HelpCircle, Book, BookOpen, Library, Archive, Inbox, Send, Download,
  Upload, Save, Trash2, Edit, Copy, Plus, Minus, Play, Pause, RefreshCw,
  Filter, SortAsc, Grid, List, Map, MapPin, Navigation, Compass, Clock, Timer,
  Sun, Moon, Cloud as CloudIcon, Server, HardDrive, Cpu, Monitor, Smartphone,
  Camera, Image, Video, Music, Headphones, Mic, Volume2, Wifi,
  Car, Bike, Plane, Train, Ship, Bus, Anchor, Rocket,
  Coffee, Utensils, ShoppingBag, Gift, Baby, Users2, GraduationCap, School,
  Stethoscope, Pill, Beaker, TestTube, Microscope, Atom, FlaskConical, Leaf,
} from 'lucide-react';

/** Curated icon set for the menu icon picker. Keys are the string stored in layout JSON. */
export const MENU_ICON_MAP: Record<string, any> = {
  Home, Package, Users, Settings, Factory, ShoppingCart, Warehouse, Landmark,
  Receipt, BarChart3, Boxes, ShieldAlert, FileText, Cog, LayoutDashboard, Database,
  Search, Star, Heart, Bell, Calendar, ClipboardList, Folder, FolderOpen, Layers,
  Link: LinkIcon, ExternalLink, Globe, Briefcase, Building, Building2, Truck,
  Wrench, Hammer, Zap, Activity, TrendingUp, PieChart, LineChart, DollarSign,
  CreditCard, Wallet, Percent, Tag, Tags, Bookmark, Flag, Award, Trophy,
  Mail, MessageSquare, Phone, User, UserCheck, UserPlus, UserCog, ShieldCheck,
  Lock, Unlock, Key, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, AlertCircle,
  Info, HelpCircle, Book, BookOpen, Library, Archive, Inbox, Send, Download,
  Upload, Save, Trash2, Edit, Copy, Plus, Minus, Play, Pause, RefreshCw,
  Filter, SortAsc, Grid, List, Map, MapPin, Navigation, Compass, Clock, Timer,
  Sun, Moon, Cloud: CloudIcon, Server, HardDrive, Cpu, Monitor, Smartphone,
  Camera, Image, Video, Music, Headphones, Mic, Volume2, Wifi,
  Car, Bike, Plane, Train, Ship, Bus, Anchor, Rocket,
  Coffee, Utensils, ShoppingBag, Gift, Baby, Users2, GraduationCap, School,
  Stethoscope, Pill, Beaker, TestTube, Microscope, Atom, FlaskConical, Leaf,
};

export const MENU_ICON_NAMES = Object.keys(MENU_ICON_MAP).sort();

/** Given an icon name (string) or a lucide component, return the component to render. */
export function resolveIcon(icon: any, fallback: any = Boxes) {
  if (!icon) return fallback;
  if (typeof icon === 'string') return MENU_ICON_MAP[icon] ?? fallback;
  return icon;
}

/** Reverse lookup: given a lucide component, return its stored name (best effort). */
export function iconToName(icon: any): string | undefined {
  if (!icon) return undefined;
  if (typeof icon === 'string') return icon;
  const name = icon.displayName || icon.name;
  if (name && MENU_ICON_MAP[name]) return name;
  // fallback: scan
  for (const [n, comp] of Object.entries(MENU_ICON_MAP)) {
    if (comp === icon) return n;
  }
  return undefined;
}
