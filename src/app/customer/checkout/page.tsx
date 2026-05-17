
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { usePortal } from '@/components/portal-provider';
import { PortalNav } from '@/components/shared/portal-nav';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Wallet, 
  Calendar, Users, Bed, Utensils, Receipt, 
  Lock, User, Info, Smartphone, MapPin, Building, Globe, Mailbox
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EgyptianHorizonLogo } from '@/components/shared/horizon-logo';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes } from '@/lib/translations/countries';

export default function CheckoutPage() {
  const { t, isRTL, setIsLoading, createBooking, updateRoomStatus, user, rooms } = usePortal();
  const { toast } = useToast();
  const router = useRouter();
  
  const [booking, setBooking] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'arrival' | 'online'>('online');
  const [status, setStatus] = useState<'idle' | 'processing'>('idle');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const yearInputRef = useRef<HTMLInputElement>(null);
  const cvvInputRef = useRef<HTMLInputElement>(null);

  const [paymentData, setPaymentData] = useState({ 
    cardHolder: "", 
    cardNumber: "", 
    expMonth: "", 
    expYear: "", 
    cvv: "",
    address: "",
    city: "",
    zip: "",
    nationality: "EG"
  });

  const fieldBorder = "border-inner border-[1.2px]";

  useEffect(() => {
    const saved = localStorage.getItem('bermuda_pending_booking');
    if (saved) setBooking(JSON.parse(saved));
    else router.push('/customer');
  }, [router]);

  const handleMonthChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 2);
    if (!numeric) {
      setPaymentData({ ...paymentData, expMonth: "" });
      return;
    }
    const firstDigit = parseInt(numeric[0]);
    if (firstDigit >= 2 && numeric.length === 1) {
      setPaymentData({ ...paymentData, expMonth: '0' + numeric });
      yearInputRef.current?.focus();
    } else {
      setPaymentData({ ...paymentData, expMonth: numeric });
      if (numeric.length === 2) yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 2);
    setPaymentData({ ...paymentData, expYear: numeric });
    if (numeric.length === 2) cvvInputRef.current?.focus();
  };

  const handleFinalProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentType === 'online' && !paymentData.cardNumber) {
      setIsPaymentModalOpen(true);
      return;
    }
    setStatus('processing');
    
    setTimeout(async () => {
      const targetRoom = rooms.find(r => r.status === 'available' && r.type === booking.roomType);
      const bookingId = `HOR-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      
      const finalBooking = { 
        ...booking, 
        id: bookingId, 
        status: 'Active', 
        isPaid: paymentType === 'online', 
        createdAt: new Date().toISOString(), 
        paymentMethod: paymentType === 'online' ? t('payment.pay_online') : t('payment.pay_arrival'), 
        roomId: targetRoom?.number || '---', 
        roomPhysicalId: targetRoom?.id || null,
        source: 'customer',
        guest: {
          name: user?.name || t('walkin.logic.primary_guest'),
          identity: user?.identity || '---',
          phone: user?.phone || '---',
          nationality: user?.nationality || 'EG',
          email: user?.email || '---'
        }
      };

      await createBooking(finalBooking);
      if (targetRoom) await updateRoomStatus(targetRoom.id, 'occupied', bookingId);
      
      localStorage.removeItem('bermuda_pending_booking');
      setStatus('idle');
      toast({ title: t('payment.instant_confirm'), description: t('checkout.success_title') });
      setIsLoading(true);
      setTimeout(() => { setIsLoading(false); router.push('/customer/dashboard'); }, 1500);
    }, 2000);
  };

  if (!booking) return null;

  const Row = ({ label, value, icon: Icon, isTotal = false }: any) => (
    <div className={cn("flex items-center justify-between py-2 border-b border-border/5 last:border-0", isTotal && "pt-4 border-t-2 border-primary/20 border-b-0")}>
      <div className="flex items-center gap-2 opacity-50">
        {Icon && <Icon size={12} className="text-primary" />}
        <span className="text-[10px] font-black uppercase tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{label}</span>
      </div>
      <span className={cn("text-[11px] font-black", isTotal ? "text-primary text-base" : "text-foreground/80")}>{value}</span>
    </div>
  );

  const isCardFilled = !!(paymentData.cardNumber && paymentData.expMonth && paymentData.expYear && paymentData.cvv);

  return (
    <main className="min-h-screen bg-background portal-transition-bg pb-20 relative overflow-x-hidden">
      <PortalNav />
      <AnimatePresence>
        {status === 'processing' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[300] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-8"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                className="w-[100px] h-[100px] sm:w-[125px] sm:h-[125px] lg:w-[150px] lg:h-[150px] border-2 border-primary/20 border-t-primary rounded-full" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <EgyptianHorizonLogo 
                  isStatic={true} 
                  className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 opacity-40" 
                />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-40" style={{ wordSpacing: '0.18em' }}>{t('checkout.processing')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 pt-28 max-w-[500px]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <header className="text-center space-y-1">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase px-3 tracking-[0.02em]">{t('checkout.success_title')}</Badge>
            <h1 className="text-xl font-black tracking-tighter">{t('payment.summary_title')}</h1>
          </header>

          <Card className="p-5 border-outer bg-card/40 backdrop-blur-sm rounded-[15px] shadow-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1 text-start">
                <Label className="text-[10px] font-black uppercase opacity-30 flex items-center gap-1.5 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}><Calendar size={10} /> {t('hotel.checkin')}</Label>
                <p className="text-[10px] font-black" suppressHydrationWarning>{(booking.checkIn ?? booking.check_in) ? format(new Date(booking.checkIn ?? booking.check_in), 'dd MMM yyyy') : '---'}</p>
              </div>
              <div className="space-y-1 text-start">
                <Label className="text-[10px] font-black uppercase opacity-30 flex items-center gap-1.5 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}><Calendar size={10} /> {t('hotel.checkout')}</Label>
                <p className="text-[10px] font-black" suppressHydrationWarning>{(booking.checkOut ?? booking.check_out) ? format(new Date(booking.checkOut ?? booking.check_out), 'dd MMM yyyy') : '---'}</p>
              </div>
              <div className="space-y-1 text-start">
                <Label className="text-[10px] font-black uppercase opacity-30 flex items-center gap-1.5 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}><Bed size={10} /> {t('booking.room_type')}</Label>
                <p className="text-[10px] font-black">{t(`booking.${booking.roomType}`)}</p>
              </div>
              <div className="space-y-1 text-start">
                <Label className="text-[10px] font-black uppercase opacity-30 flex items-center gap-1.5 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}><Users size={10} /> {t('search.guests')}</Label>
                <p className="text-[10px] font-black">{booking.totalPersons} {t('search.guests')}</p>
              </div>
              <div className="space-y-1 text-start col-span-2">
                <Label className="text-[10px] font-black uppercase opacity-30 flex items-center gap-1.5 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}><Utensils size={10} /> {t('meal.plan_title')}</Label>
                <p className="text-[10px] font-black">{t(`meal.${booking.mealPlan}`)}</p>
              </div>
            </div>
          </Card>

          <div className="px-2 space-y-1">
            <Row label={t('invoice.breakdown.accommodation')} value={`${booking.totalPrice?.toLocaleString()} ${t('common.currency')}`} icon={Receipt} />
            <Row label={t('invoice.breakdown.extra_services')} value={`0 ${t('common.currency')}`} icon={Info} />
            <Row label={t('payment.final_total')} value={`${booking.totalPrice?.toLocaleString()} ${t('common.currency')}`} isTotal={true} />
          </div>

          <div className="space-y-3 pt-4 border-t border-border/10">
            <Label className="text-[10px] font-black uppercase opacity-40 block text-start px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('invoice.breakdown.payment_method')}</Label>
            <div className="flex gap-2 p-1 bg-muted/10 rounded-[12px] border border-inner">
              <button onClick={() => setPaymentType('online')} className={cn("flex-1 h-9 rounded-[9px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 tracking-[0.02em]", paymentType === 'online' ? "bg-primary text-white shadow-md" : "opacity-40 hover:opacity-100")} style={{ wordSpacing: '0.18em' }}><CreditCard size={14} /> {t('payment.pay_online')}</button>
              <button onClick={() => setPaymentType('arrival')} className={cn("flex-1 h-9 rounded-[9px] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 tracking-[0.02em]", paymentType === 'arrival' ? "bg-primary text-white shadow-md" : "opacity-40 hover:opacity-100")} style={{ wordSpacing: '0.18em' }}><Wallet size={14} /> {t('payment.pay_arrival')}</button>
            </div>
          </div>

          <div className="min-h-[100px]">
            <AnimatePresence mode="wait">
              {paymentType === 'online' ? (
                <motion.div key="online" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4">
                  <button onClick={() => setIsPaymentModalOpen(true)} className={cn("w-full h-12 border-2 border-dashed rounded-[12px] flex items-center justify-center gap-3 transition-all", isCardFilled ? "border-green-500/30 bg-green-500/5 text-green-600" : "border-primary/20 bg-primary/5 text-primary")}>
                    {isCardFilled ? (
                      <React.Fragment>
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.02em]">**** {paymentData.cardNumber.slice(-4)}</span>
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <CreditCard size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.payment_details')}</span>
                      </React.Fragment>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="arrival" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex flex-col items-center justify-center p-6 space-y-3 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-[15px] text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500"><Info size={16} /></div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.02em] text-amber-600/80" style={{ wordSpacing: '0.18em' }}>{t('payment.pay_arrival')}</p>
                    <p className="text-lg font-black text-amber-600" suppressHydrationWarning>{booking.totalPrice?.toLocaleString()} {t('common.currency')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2">
            <button onClick={handleFinalProcess} disabled={status !== 'idle'} className={cn("w-full h-12 text-white font-black text-[10px] uppercase tracking-[0.18em] rounded-[12px] shadow-lg transition-all flex items-center justify-center gap-3 border-b-4 border-primary/30", status === 'processing' ? "bg-muted cursor-wait" : "bg-primary hover:brightness-110 active:scale-[0.98]")} style={{ wordSpacing: '0.18em' }}>
              {status === 'processing' ? t('checkout.processing') : <React.Fragment>{t('payment.submit_btn')} <ShieldCheck size={16} /></React.Fragment>}
            </button>
          </div>
        </motion.div>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent 
          className="max-w-[550px] w-[95%] p-0 border-outer rounded-[20px] bg-background dark:bg-card backdrop-blur-3xl shadow-2xl overflow-y-auto scrollbar-hide flex flex-col outline-none z-[301]"
        >
          <DialogHeader className="p-4 bg-muted/20 dark:bg-primary/5 border-b border-border/10">
            <DialogTitle className="text-lg font-black tracking-tighter flex items-center gap-3 text-primary"><CreditCard size={20} /> {t('checkout.payment_details')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.cardholder')}</Label>
                <Input value={paymentData.cardHolder} onChange={e => setPaymentData({...paymentData, cardHolder: e.target.value})} className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.card_number')}</Label>
                <Input maxLength={16} value={paymentData.cardNumber} onChange={e => setPaymentData({...paymentData, cardNumber: e.target.value.replace(/\D/g,'')})} className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)} />
              </div>
              
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.expiry')}</Label>
                  <div className={cn("flex gap-1.5 p-1 bg-background dark:bg-muted/10 rounded-[9px] h-10 items-center justify-center", fieldBorder)}>
                    <Input value={paymentData.expMonth} onChange={e => handleMonthChange(e.target.value)} className="h-full w-14 text-center text-[10px] font-black border-none bg-transparent" placeholder="MM" maxLength={2} />
                    <span className="opacity-20 font-bold text-[10px]">/</span>
                    <Input ref={yearInputRef} value={paymentData.expYear} onChange={e => handleYearChange(e.target.value)} className="h-full w-14 text-center text-[10px] font-black border-none bg-transparent" placeholder="YY" maxLength={2} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.cvv')}</Label>
                  <Input ref={cvvInputRef} maxLength={3} type="password" value={paymentData.cvv} onChange={e => setPaymentData({...paymentData, cvv: e.target.value.replace(/\D/g,'')})} className={cn("h-10 text-center text-[10px] font-black bg-background dark:bg-muted/10", fieldBorder)} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border/10">
              <div className="flex items-center justify-center gap-2"><Globe className="text-primary" size={12}/><span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/60" style={{ wordSpacing: '0.18em' }}>{t('checkout.billing_info')}</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.nationality')}</Label>
                  <Select value={paymentData.nationality} onValueChange={v => setPaymentData({...paymentData, nationality: v})}>
                    <SelectTrigger className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)}><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[350] max-h-60 overflow-y-auto">
                      {countryCodes.map(c => <SelectItem key={c} value={c}>{t(`country.${c}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.city')}</Label>
                  <Input value={paymentData.city} onChange={e => setPaymentData({...paymentData, city: e.target.value})} className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.address')}</Label>
                  <Input value={paymentData.address} onChange={e => setPaymentData({...paymentData, address: e.target.value})} className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-70 px-1 tracking-[0.02em]" style={{ wordSpacing: '0.18em' }}>{t('checkout.postal')}</Label>
                  <Input value={paymentData.zip} onChange={e => setPaymentData({...paymentData, zip: e.target.value})} className={cn("h-10 text-[10px] font-bold bg-background dark:bg-muted/10", fieldBorder)} />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-muted/20 dark:bg-primary/5 border-t border-border/10 flex justify-center shrink-0">
            <button onClick={() => setIsPaymentModalOpen(false)} className="h-11 px-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.18em] rounded-[10px] shadow-xl border-b-4 border-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 w-full md:w-auto" style={{ wordSpacing: '0.18em' }}>{t('common.save')} <CheckCircle2 size={16} /></button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
