"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { usePortal } from '@/components/portal-provider';
import { PortalNav } from '@/components/shared/portal-nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Plus, ShieldCheck, CheckCircle2, X, RotateCcw, Printer, BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

/**
 * @fileOverview لوحة تحكم الموظف الموحدة - تربط بين حجوزات العملاء والتشغيل الداخلي.
 */
export default function DashboardPage() {
  const { user, allBookings, setAllBookings, isRTL, addAuditLog, updateRoomStatus, t, mounted: isHydrated, refreshData, isNavVisible } = usePortal();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && (!user || user.role !== 'staff')) router.push('/');
  }, [user, router, isHydrated]);

  useEffect(() => { if (isHydrated) refreshData(); }, [isHydrated, refreshData]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bookings = Array.isArray(allBookings) ? allBookings : [];
    if (!q) return bookings;
    return bookings.filter(b => 
      b.guest?.name?.toLowerCase().includes(q) || 
      b.guest?.identity?.includes(q) ||
      b.id?.toLowerCase().includes(q)
    );
  }, [searchQuery, allBookings]);

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    const booking = allBookings.find(b => b.id === id);
    if (nextStatus === 'Cancelled' && booking?.roomPhysicalId) await updateRoomStatus(booking.roomPhysicalId, 'available');
    const updated = allBookings.map(b => b.id === id ? { ...b, status: nextStatus } : b);
    setAllBookings(updated);
    
    // التخزين بنظام المفتاح والبارامترات
    addAuditLog('audit.action.status', `audit.log.status_update|${id}|${nextStatus}`);
    
    toast({ title: t('notification.booking_updated') });
    setIsDetailsOpen(false);
  };

  if (!isHydrated || !user) return null;

  return (
    <main className="min-h-screen bg-background portal-transition-bg pb-32 lg:pb-20 pt-28">
      <PortalNav />
      <div className="container mx-auto px-6 space-y-8 max-w-[1600px]">
        <header className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-start">
            <h1 className="text-3xl font-black tracking-tighter mb-[15px]">{t('reception.title')}</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.1em]">{t('reception.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group min-w-[300px]">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 opacity-30", isRTL ? "right-4" : "left-4")} size={16} />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('reception.search_placeholder')} className={cn("h-11 rounded-[9px] bg-muted/5 border-inner text-[10px] font-bold", isRTL ? "pr-12" : "pl-12")} />
            </div>
            
            <button 
              onClick={() => router.push('/reports')} 
              className="h-11 px-6 bg-muted/10 border-inner text-foreground/70 font-black text-[10px] uppercase rounded-[9px] hover:bg-muted/20 transition-all flex items-center gap-2 outline-none shadow-sm tracking-widest"
            >
              <BarChart3 size={16} className="text-primary" /> {t('reports.view_reports')}
            </button>

            <button onClick={() => router.push('/walk-in')} className="h-11 px-6 bg-primary text-white font-black text-[10px] uppercase rounded-[9px] shadow-xl hover:brightness-110 active:scale-[0.95] transition-all flex items-center gap-2 outline-none border-b-4 border-primary/30 tracking-widest"><Plus size={16} /> {t('reception.walkin_btn')}</button>
          </div>
        </header>

        <Card className="bg-card/40 backdrop-blur-xl border-outer rounded-[9px] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-border/10 bg-primary/5 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.1em]">{t('reception.table_title')}</h2>
            <Badge variant="outline" className="border-primary/20 text-primary font-black text-[9px] tracking-widest">{filteredBookings.length} {t('reception.active_records')}</Badge>
          </div>
          
          <ScrollArea className="w-full h-[60vh]">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="border-border/5 bg-muted/5">
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.name')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.identity')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.phone')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.period')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.status')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.financial')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.nationality')}</TableHead>
                  <TableHead className="text-center text-[8.5px] font-black uppercase px-1 tracking-widest">{t('reception.table_header.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((b: any) => {
                  const natCode = b.guest?.nationality;
                  const nationalityLabel = natCode ? t(`nationality.${natCode}`) : '---';
                  const countryLabel = natCode ? t(`country.${natCode}`) : '---';
                  const displayNat = nationalityLabel.includes('nationality.') ? (countryLabel.includes('country.') ? '---' : countryLabel) : nationalityLabel;

                  return (
                    <TableRow key={b.id} className="border-border/5 hover:bg-primary/[0.02] h-16">
                      <TableCell className="text-[10px] font-black text-center px-1">{b.guest?.name || '---'}</TableCell>
                      <TableCell className="text-[9px] font-bold opacity-60 text-center px-1">{b.guest?.identity || '---'}</TableCell>
                      <TableCell className="text-[9px] font-bold opacity-60 text-center px-1" dir="ltr">{b.guest?.phone || '---'}</TableCell>
                      <TableCell className="text-[9px] font-black text-center px-1" suppressHydrationWarning>{(b.checkIn ?? b.check_in) ? format(new Date(b.checkIn ?? b.check_in), 'dd/MM') : '?'} - {(b.checkOut ?? b.check_out) ? format(new Date(b.checkOut ?? b.check_out), 'dd/MM') : '?'}</TableCell>
                      <TableCell className="text-center px-1"><Badge className={cn("text-[7px] font-black uppercase tracking-widest", b.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')}>{t(`reception.status.${b.status?.toLowerCase()}`)}</Badge></TableCell>
                      <TableCell className="text-[10px] font-black text-primary text-center px-1" suppressHydrationWarning>{b.totalPrice?.toLocaleString()} {t('common.currency')}</TableCell>
                      <TableCell className="text-[9px] font-bold opacity-60 text-center px-1">{displayNat}</TableCell>
                      <TableCell className="text-center px-1"><button onClick={() => { setSelectedBooking(b); setIsDetailsOpen(true); }} className="h-8 px-4 bg-primary/10 text-primary border border-primary/20 rounded-[7px] font-black text-[8px] uppercase tracking-widest">{t('reception.table_header.details')}</button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent 
          style={{ 
            height: isNavVisible ? 'calc(96vh - 80px)' : '96vh',
            top: isNavVisible ? 'calc(50% + 40px)' : '50%',
            maxHeight: isNavVisible ? 'calc(96vh - 80px)' : '96vh',
            transform: 'translate(-50%, -50%)'
          }}
          className="max-w-[600px] p-0 border-outer rounded-[9px] bg-card/95 backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col transition-none"
        >
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/10 flex flex-col items-center shrink-0">
            <DialogTitle className="text-xl font-black flex items-center gap-3 tracking-tighter"><ShieldCheck className="text-primary" /> {t('reception.details_modal.title')}</DialogTitle>
            <Badge variant="outline" className="mt-2 h-6 font-mono text-primary border-primary/20 text-[10px]">#{selectedBooking?.id?.toUpperCase()}</Badge>
          </DialogHeader>
          <div className="p-8 space-y-6 flex-1 overflow-y-auto clean-scrollbar">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-start"><span className="text-[8px] font-black opacity-30 uppercase block tracking-widest">{t('reception.details_modal.guest_main')}</span><p className="text-[13px] font-black">{selectedBooking?.guest?.name}</p></div>
                <div className="text-start"><span className="text-[8px] font-black opacity-30 uppercase block tracking-widest">{t('reception.details_modal.hotel')}</span><p className="text-[13px] font-black">{t(selectedBooking?.hotelName || '')}</p></div>
              </div>
              <div className="space-y-4">
                <div className="text-start"><span className="text-[8px] font-black opacity-30 uppercase block tracking-widest">{t('reception.details_modal.unit_prefix')}</span><p className="text-[13px] font-black text-primary">#{selectedBooking?.roomId || '---'}</p></div>
                <div className="text-start"><span className="text-[8px] font-black opacity-30 uppercase block tracking-widest">{t('reception.details_modal.stay_period')}</span><p className="text-[11px] font-bold" suppressHydrationWarning>{selectedBooking?.checkIn ? format(new Date(selectedBooking.checkIn), 'dd MMM yyyy') : '---'} - {selectedBooking?.checkOut ? format(new Date(selectedBooking.checkOut), 'dd MMM yyyy') : '---'}</p></div>
              </div>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/10 rounded-[9px] flex justify-between items-center">
              <div className="text-start"><span className="text-[10px] font-black uppercase opacity-40 block tracking-widest">{t('reception.details_modal.final_total')}</span><p className="text-2xl font-black text-primary tracking-tighter" suppressHydrationWarning>{selectedBooking?.totalPrice?.toLocaleString()} <span className="text-xs">{t('common.currency')}</span></p></div>
              <Badge className="bg-primary/10 text-primary border-none text-[9px] h-6 uppercase font-black tracking-widest">{selectedBooking?.paymentMethod || t('payment.pay_arrival')}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-3 pt-4 border-t border-border/10">
              <button onClick={() => router.push(`/invoice/${selectedBooking?.id}`)} className="h-12 bg-muted/10 rounded-[9px] font-black text-[8px] uppercase flex flex-col items-center justify-center gap-1 tracking-widest"><Printer size={14} /> {t('reception.details_modal.print_invoice')}</button>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'Completed')} className="h-12 bg-green-500 text-white rounded-[9px] font-black text-[8px] uppercase shadow-lg flex flex-col items-center justify-center gap-1 tracking-widest"><CheckCircle2 size={14} /> {t('reception.details_modal.check_in')}</button>
              <button onClick={() => handleUpdateStatus(selectedBooking.id, 'Cancelled')} className="h-12 bg-destructive/10 text-destructive border border-destructive/20 rounded-[9px] font-black text-[8px] uppercase flex flex-col items-center justify-center gap-1 tracking-widest"><X size={14} /> {t('reception.details_modal.cancel_booking')}</button>
              <button onClick={() => setIsDetailsOpen(false)} className="h-12 bg-muted/5 rounded-[9px] font-black text-[8px] uppercase flex flex-col items-center justify-center gap-1 tracking-widest"><RotateCcw size={14} /> {t('common.close')}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
