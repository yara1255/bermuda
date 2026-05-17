"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { allTranslations } from '@/lib/translations/index';
import { LoadingScreen } from './shared/loading-screen';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/api';

/**
 * @interface User
 * تعريف هيكل بيانات المستخدم (موظف أو عميل)
 */
interface User {
  id?: string;
  identity: string; 
  name: string;
  email: string;
  phone?: string;
  avatar?: string; 
  role: 'customer' | 'staff';
  status: 'active' | 'pending' | 'suspended';
  nationality?: string;
}

interface BookingRecord {
  id: string;
  status?: string;
  roomPhysicalId?: string;
  guest?: {
    name?: string;
    identity?: string;
    phone?: string;
    nationality?: string;
  };
  checkIn?: string;
  checkOut?: string;
  totalPrice?: number;
  [key: string]: any;
}

interface AuditLogEntry {
  id?: string;
  action?: string;
  details?: string;
  user?: string;
  createdAt?: string;
  [key: string]: any;
}

interface NotificationEntry {
  id?: string;
  title?: string;
  msg?: string;
  createdAt?: string;
  [key: string]: any;
}

interface SavedCard {
  id: string;
  cvv?: string;
  lockUntil?: string;
  [key: string]: any;
}

type SavedCardInput = Omit<SavedCard, 'id'> & { id?: string };

interface HotelRecord {
  id: string;
  name?: string;
  cityId?: string;
  [key: string]: any;
}

interface CityRecord {
  id: string;
  name?: string;
  [key: string]: any;
}

export interface PhysicalRoom {
  id: string;
  hotelId: string;
  number: string;
  type: 'single' | 'double' | 'suite' | 'family';
  floor: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  currentBookingId?: string;
  basePrice?: number;
}

/**
 * @interface PortalContextType
 * تعريف كافة الوظائف والحالات المتاحة عبر المنظومة
 */
interface PortalContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isRTL: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setIsLoading: (active: boolean) => void;
  t: (key: string) => string;
  allBookings: BookingRecord[];
  setAllBookings: (bookings: BookingRecord[]) => void;
  createBooking: (bookingData: any) => Promise<void>;
  mounted: boolean;
  refreshData: (forceReset?: boolean) => void;
  rooms: PhysicalRoom[];
  updateRoomStatus: (id: string, status: string, bookingId?: string) => Promise<void>;
  manageRoom: (action: 'add' | 'edit' | 'delete', room: Partial<PhysicalRoom>) => void;
  getHotelAvailableRooms: (hotelId: string, type: string) => number;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  compareList: string[];
  setCompareList: (list: string[]) => void;
  toggleCompare: (id: string) => void;
  auditLogs: AuditLogEntry[];
  addAuditLog: (action: string, details: string) => void;
  notifications: NotificationEntry[];
  addNotification: (title: string, msg: string) => void;
  clearNotifications: () => void;
  hotels: HotelRecord[];
  cities: CityRecord[];
  savedCards: SavedCard[];
  addSavedCard: (card: SavedCardInput) => void;
  deleteSavedCard: (id: string) => void;
  verifySavedCardCVV: (id: string, cvv: string) => { success: boolean; isLocked?: boolean; remainingAttempts?: number };
  isNavVisible: boolean;
  setIsNavVisible: (visible: boolean) => void;
  portalMode: 'customer' | 'staff';
  isLogoutDialogOpen: boolean;
  setIsLogoutDialogOpen: (open: boolean) => void;
  isBackGuardOpen: boolean;
  setIsBackGuardOpen: (open: boolean) => void;
  isDatabaseOffline: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

/** تحويل حقول snake_case القادمة من الـ API إلى camelCase المتوقعة في الـ frontend */
function normalizeBooking(b: any): BookingRecord {
  return {
    ...b,
    checkIn: b.checkIn ?? b.check_in,
    checkOut: b.checkOut ?? b.check_out,
    totalPrice: b.totalPrice ?? b.total_price,
    hotelId: b.hotelId ?? b.hotel_id,
    roomId: b.roomId ?? b.room_id,
    roomPhysicalId: b.roomPhysicalId ?? b.room_physical_id ?? b.room_id ?? b.roomId,
    paymentStatus: b.paymentStatus ?? b.payment_status,
    referenceNo: b.referenceNo ?? b.reference_no,
    guest: b.guest ?? {
      name: b.guest_name ?? null,
      identity: b.guest_identity ?? null,
      phone: b.guest_phone ?? null,
      nationality: b.guest_nationality ?? null,
    },
  };
}

/**
 * @component PortalProvider
 * المزود الرئيسي للحالة (Global State) - محرك المنظومة الملكية
 */
export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark'); 
  const [language, setLanguageState] = useState<string>('ar');
  const [loading, setLoading] = useState(false);
  const [allBookings, setAllBookingsState] = useState<BookingRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareListState] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isBackGuardOpen, setIsBackGuardOpen] = useState(false);
  const [isDatabaseOffline, setIsDatabaseOffline] = useState(false);

  const pathname = usePathname();
  const isRTL = language === 'ar';

  useEffect(() => {
    setLoading(false);
    setIsLogoutDialogOpen(false);
    setIsBackGuardOpen(false);
    setIsNavVisible(true);
  }, [pathname]);

  // تحديث خصائص HTML الأساسية حسب اللغة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, isRTL]);

  // تحديد ما إذا كان المستخدم في منطقة إدارية أم لا
  const isStaffArea = useMemo(() => 
    pathname?.startsWith('/dashboard') || 
    pathname?.startsWith('/rooms') || 
    pathname?.startsWith('/walk-in') || 
    pathname?.startsWith('/reports') || 
    pathname?.startsWith('/audit-logs') || 
    pathname?.startsWith('/employee'),
  [pathname]);

  const portalMode: 'customer' | 'staff' = (user?.role === 'staff' || isStaffArea) ? 'staff' : 'customer';

  const safeJSONParse = (val: string | null, fallback: any) => {
    if (!val || val === "undefined" || val === "null" || val.trim() === "") return fallback;
    try { return JSON.parse(val); } catch (e) { return fallback; }
  };

  /**
   * تبديل الثيم الملوكي وحفظه
   */
  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bermuda_theme', newTheme);
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    }
  }, []);

  /**
   * تبديل اللغة وحفظها
   */
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bermuda_lang', lang);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUser = safeJSONParse(localStorage.getItem('bermuda_active_user'), null);
    const savedTheme = localStorage.getItem('bermuda_theme') as 'light' | 'dark';
    const savedLang = localStorage.getItem('bermuda_lang') || 'ar';
    const savedWish = safeJSONParse(localStorage.getItem('bermuda_wishlist'), []);
    const savedComp = safeJSONParse(localStorage.getItem('bermuda_compare'), []);

    setUserState(savedUser);
    if (savedTheme) setTheme(savedTheme);
    setLanguageState(savedLang);
    setWishlist(savedWish);
    setCompareListState(savedComp);
  }, [setTheme]);

  const setAllBookings = useCallback((bookings: BookingRecord[]) => {
    setAllBookingsState(bookings);
  }, []);

  /**
   * دالة المزامنة الرئيسية - تجلب كافة البيانات من قاعدة البيانات
   */
  const refreshData = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const savedUser = safeJSONParse(localStorage.getItem('bermuda_active_user'), null);

    // سحب البيانات من الـ API الحقيقي (Laravel)
    try {
      const requests: Promise<any>[] = [
  apiRequest('/rooms'),
  apiRequest('/hotels'),
  apiRequest('/cities'),
];

if (savedUser) {
  requests.push(
    apiRequest('/bookings'),
    apiRequest('/audit-logs'),
    apiRequest('/notifications'),
    apiRequest('/saved-cards')
  );
}

const results = await Promise.allSettled(requests);

const hasOfflineError = results.some(
  (result) => result.status === 'rejected' && String(result.reason?.message || '') === 'DATABASE_OFFLINE'
);

const [roomsResult, hotelsResult, citiesResult, bookingsResult, logsResult, notifsResult, cardsResult] = results;

const dbRooms = roomsResult.status === 'fulfilled' ? roomsResult.value : [];
const dbHotels = hotelsResult.status === 'fulfilled' ? hotelsResult.value : [];
      const dbCities = citiesResult.status === 'fulfilled' ? citiesResult.value : [];
      const bookings = bookingsResult?.status === 'fulfilled' ? bookingsResult.value : [];
      const logs = logsResult?.status === 'fulfilled' ? logsResult.value : [];
      const notifs = notifsResult?.status === 'fulfilled' ? notifsResult.value : [];
      const dbCards = cardsResult?.status === 'fulfilled' ? cardsResult.value : [];

      if (Array.isArray(bookings)) setAllBookingsState(bookings.map(normalizeBooking));
      if (Array.isArray(logs)) setAuditLogs(logs);
      if (Array.isArray(notifs)) setNotifications(notifs);
      if (Array.isArray(dbRooms)) setRooms(dbRooms);
      if (Array.isArray(dbHotels)) setHotels(dbHotels);
      if (Array.isArray(dbCities)) setCities(dbCities);
      if (Array.isArray(dbCards)) setSavedCards(dbCards);

      setIsDatabaseOffline(hasOfflineError);

    } catch (e: any) {
      if (e.message === 'DATABASE_OFFLINE') {
        setIsDatabaseOffline(true);
        console.warn("[Bermuda Provider] Real-time sync failed. Database offline.");
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshData();
      setMounted(true);
    };
    init();
  }, [refreshData]);

  /**
   * محرك الترجمة المركزي (Translation Engine)
   */
  const t = useCallback((key: string) => {
    if (!key) return '';
    const dict = (allTranslations as any)[language]?.[portalMode] || (allTranslations as any)[language]?.['customer'];
    if (dict && typeof dict[key] === 'string') return dict[key];
    const parts = key.split('.');
    let result: any = dict;
    for (const part of parts) { result = result?.[part]; }
    return typeof result === 'string' ? result : key;
  }, [language, portalMode]);

  const createBooking = async (data: any) => {
    try {
      await apiRequest('/bookings', { method: 'POST', body: JSON.stringify(data) });
      await refreshData();
    } catch (e) {
      throw e;
    }
  };

const updateRoomStatus = async (id: string, status: any, bookingId?: string) => {
  try {
    const updatedRoom = await apiRequest(`/rooms/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, booking_id: bookingId })
    });

    setRooms(prev =>
      prev.map(room =>
        String(room.id) === String(id)
          ? { ...room, ...updatedRoom, status: status as any, currentBookingId: bookingId }
          : room
      )
    );
  } catch (e) {
    console.error('Failed to update room status:', e);
  }
};

  const manageRoom = async (action: 'add' | 'edit' | 'delete', room: Partial<PhysicalRoom>) => {
    try {
      if (action === 'add') await apiRequest('/rooms', { method: 'POST', body: JSON.stringify(room) });
      if (action === 'edit') await apiRequest(`/rooms/${room.id}`, { method: 'PUT', body: JSON.stringify(room) });
      if (action === 'delete') await apiRequest(`/rooms/${room.id}`, { method: 'DELETE' });
      await refreshData();
    } catch (e) { console.warn('[Bermuda] manageRoom failed:', e); }
  };

  const addAuditLog = async (action: string, details: string) => {
    try { 
      await apiRequest('/audit-logs', { 
        method: 'POST', 
        body: JSON.stringify({ action, details, user: user?.name || 'System' }) 
      }); 
      await refreshData();
    } catch (e) { console.warn('[Bermuda] addAuditLog failed:', e); }
  };

  const addNotification = async (title: string, msg: string) => {
    try { 
      await apiRequest('/notifications', { 
        method: 'POST', 
        body: JSON.stringify({ title, msg }) 
      }); 
      await refreshData();
    } catch (e) { console.warn('[Bermuda] addNotification failed:', e); }
  };

  const clearNotifications = async () => {
    try { await apiRequest('/notifications', { method: 'DELETE' }); await refreshData(); } catch (e) { console.warn('[Bermuda] clearNotifications failed:', e); }
  };

  const toggleWishlist = (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter(i => i !== id) : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem('bermuda_wishlist', JSON.stringify(next));
  };

  const setCompareList = useCallback((list: string[]) => {
    setCompareListState(list);
    localStorage.setItem('bermuda_compare', JSON.stringify(list));
  }, []);

  const toggleCompare = (id: string) => {
    const next = compareList.includes(id) ? compareList.filter(i => i !== id) : (compareList.length < 2 ? [...compareList, id] : compareList);
    setCompareList(next);
  };

  const addSavedCard = async (card: SavedCardInput) => {
    try {
      await apiRequest('/saved-cards', { method: 'POST', body: JSON.stringify(card) });
      await refreshData();
    } catch (e) { console.warn('[Bermuda] addSavedCard failed:', e); }
  };

  const deleteSavedCard = async (id: string) => {
    try {
      await apiRequest(`/saved-cards/${id}`, { method: 'DELETE' });
      await refreshData();
    } catch (e) { console.warn('[Bermuda] deleteSavedCard failed:', e); }
  };

  const verifySavedCardCVV = (id: string, cvv: string) => {
    const card = savedCards.find(c => c.id === id);
    if (!card) return { success: false };
    if (card.lockUntil && new Date(card.lockUntil) > new Date()) return { success: false, isLocked: true };
    if (card.cvv === cvv) return { success: true };
    return { success: false, remainingAttempts: 2 };
  };

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('bermuda_active_user', JSON.stringify(u));
      refreshData(); 
    } else {
      localStorage.removeItem('bermuda_active_user');
      localStorage.removeItem('bermuda_token');
    }
  };

  const getHotelAvailableRooms = (h: string, t: string) => rooms.filter(r => r.hotelId === h && r.type === t && r.status === 'available').length;


  const contextValue = useMemo(() => ({
  language,
  setLanguage,
  user,
  setUser,
  theme,
  setTheme,
  setIsLoading: setLoading,
  t,
  allBookings,
  setAllBookings,
  createBooking,
  mounted,
  refreshData,
  rooms,
  updateRoomStatus,
  manageRoom,
  getHotelAvailableRooms,
  wishlist,
  toggleWishlist,
  compareList,
  setCompareList,
  toggleCompare,
  auditLogs,
  addAuditLog,
  notifications,
  addNotification,
  clearNotifications,
  hotels,
  cities,
  savedCards,
  addSavedCard,
  deleteSavedCard,
  verifySavedCardCVV,
  isNavVisible,
  setIsNavVisible,
  portalMode,
  isLogoutDialogOpen,
  setIsLogoutDialogOpen,
  isBackGuardOpen,
  setIsBackGuardOpen,
  isDatabaseOffline,
  isRTL
}), [
  language,
  user,
  theme,
  allBookings,
  rooms,
  wishlist,
  compareList,
  auditLogs,
  notifications,
  hotels,
  cities,
  savedCards,
  isNavVisible,
  portalMode,
  isLogoutDialogOpen,
  isBackGuardOpen,
  isDatabaseOffline,
  isRTL
]);

  return (
    <PortalContext.Provider value={contextValue}>
      <div className={cn("min-h-screen font-body antialiased transition-all", theme)}>
        {children}
        <AnimatePresence>{loading && <LoadingScreen />}</AnimatePresence>
        
        {isDatabaseOffline && pathname !== '/' && (
          <div className="fixed bottom-24 right-4 z-[999] animate-bounce">
            <div className="bg-red-500 text-white text-[8px] font-black uppercase px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              DATABASE OFFLINE (Port 8000)
            </div>
          </div>
        )}
      </div>
    </PortalContext.Provider>
  );
}

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) throw new Error('usePortal must be used within PortalProvider');
  return context;
};
