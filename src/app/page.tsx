"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Ticket, FileText, Camera, Instagram, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { LocationModal } from "@/components/ui/location-modal";
import { EventInfoModal } from "@/components/ui/event-info-modal";
import { supabase } from "@/lib/supabase";
import JudgesSection from "@/components/judges-section";
import FAQSection from "@/components/faq-section";
import AvailabilitySection from "@/components/availability-section";


export default function Home() {

  {/* Sessions Actions */ }
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [isOrderPublished, setIsOrderPublished] = useState(false);

  useEffect(() => {
    // Countdown Logic
    const targetDate = new Date('2026-03-29T09:00:00');

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("¡ES HOY!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setTimeLeft(`${days}d ${hours}h`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  // Fetch 'app_settings' locally to decide if rankings/sales are open
  useEffect(() => {
    const fetchSettings = async () => {
      // Use supabase client
      // We assume settings are in table 'app_settings', row id=1
      const { data } = await supabase
        .from('app_settings')
        .select('public_rankings_visible, is_order_published')
        .eq('id', 1)
        .single();

      if (data) {
        setRankingsVisible(data.public_rankings_visible);
        setIsOrderPublished(data.is_order_published);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black relative overflow-hidden">
      {/* Background Effect with Video */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">

        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
      </div>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center max-w-4xl text-center animate-in fade-in zoom-in duration-700">

        {/* LOGO TITLE */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,0,204,0.5)] uppercase">
            Dance <span className="text-[var(--primary)] drop-shadow-[0_0_20px_rgba(255,0,204,0.8)]">IN</span> Action
          </h1>
          <p className="text-xl md:text-2xl text-pink-200 mt-4 font-light tracking-widest uppercase opacity-90">
            Campeonato Coreográfico de la Vall d'Uixó
          </p>
          <p className="text-lg md:text-xl text-[var(--primary)] mt-2 font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,0,204,0.5)]">
            29 de marzo
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {/* Date and Contact Column */}
          <div className="flex flex-col gap-4 h-full">
            <button
              onClick={() => setShowEventModal(true)}
              className="flex-[2] bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-white/10 hover:border-[var(--primary)]/50 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[var(--primary)]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>

              <Calendar className="w-8 h-8 text-[var(--primary)] group-hover:scale-110 transition-transform relative z-10" />

              <div className="relative z-10 flex flex-col items-center gap-1 w-full">
                <div className="relative h-4 w-full flex items-center justify-center">
                  <h3 className="font-bold text-white text-xs tracking-widest absolute">FECHA</h3>
                  {/* <h3 className="font-bold text-pink-300 text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute">FALTAN</h3> */}
                </div>

                <div className="relative h-6 w-full flex items-center justify-center">
                  <p className="text-white font-black text-lg leading-none absolute whitespace-nowrap">29 MARZO</p>
                  {/* <p className="text-white font-black text-xl leading-none opacity-0 group-hover:opacity-100 transition-opacity absolute font-mono">{timeLeft}</p> */}
                </div>
              </div>
            </button>

            <a
              href="https://instagram.com/cc_danceinaction"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[3] bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045] hover:border-transparent transition-all group shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <Instagram className="w-10 h-10 text-gray-300 group-hover:text-white transition-colors group-hover:scale-110 duration-300" />
              <div className="text-center">
                <h3 className="font-bold text-white text-lg">CONTACTO</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/90">@cc_danceinaction</p>
              </div>
            </a>
          </div>

          {/* Center Column with Registration and Location */}
          {/* Center Column with Registration and Location */}
          <div className="flex flex-col gap-4 h-full">
            <Link
              href="/dashboard"
              className="w-full flex-1 bg-[var(--primary)] border-2 border-[var(--primary)] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-pink-600 hover:scale-[1.02] transition-all group shadow-[0_0_20px_rgba(255,0,204,0.3)] hover:shadow-[0_0_40px_rgba(255,0,204,0.5)]"
            >
              <div className="w-16 h-16 relative mb-2 group-hover:scale-110 transition-transform">
                <Image
                  src="/logo-inscripciones-white.png"
                  alt="Logo Inscripciones"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="font-black text-white text-2xl leading-none mb-1">ACCESO ESCUELAS</h3>
                <p className="text-pink-100 text-sm font-medium">Crea tu usuario y perfil</p>
              </div>
            </Link>

            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex flex-col items-center hover:bg-white/10 hover:border-[var(--primary)]/50 transition-all group cursor-pointer"
            >
              <MapPin className="w-8 h-8 text-[var(--primary)] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-1">LUGAR</h3>
              <p className="text-gray-400 text-sm leading-tight">Teatro Municipal Carmen Tur<br /><span className="text-xs opacity-70">La Vall d'Uixó</span></p>
            </button>

            {/* ENTRADAS Button Removed - Availability now shown in main section */}
          </div>

          {/* Downloads Column */}
          <div className="flex flex-col gap-4">

            {rankingsVisible && (
              <Link
                href="/rankings"
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 border border-yellow-400/30 p-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all group shadow-[0_0_20px_rgba(255,200,0,0.2)] mb-2 animate-in slide-in-from-right-4 fade-in duration-500"
              >
                <Trophy className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                  <h3 className="font-black text-white text-xl leading-none">CLASIFICACIONES</h3>
                  <p className="text-yellow-100 text-xs font-bold">Resultados en vivo</p>
                </div>
              </Link>
            )}

            {isOrderPublished && (
              <Link
                href="/escaletas"
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 border border-fuchsia-400/30 p-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all group shadow-[0_0_20px_rgba(200,0,255,0.2)] mb-2 animate-in slide-in-from-right-4 fade-in duration-500"
              >
                <FileText className="w-8 h-8 text-white group-hover:-rotate-12 transition-transform" />
                <div className="text-left w-full pl-2">
                  <h3 className="font-black text-white text-xl leading-none">ESCALETAS</h3>
                  <p className="text-fuchsia-100 text-xs font-bold">Orden de Actuación</p>
                </div>
              </Link>
            )}

            <h3 className="text-white font-bold text-sm tracking-wider opacity-70 mb-1 mt-2">DESCARGAS</h3>

            <a
              href="/docs/bases_2026.pdf?v=2"
              target="_blank"
              download
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 hover:border-[var(--primary)] hover:scale-[1.02] transition-all group shadow-lg shadow-black/20"
            >
              <div className="bg-white/10 p-2 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                <FileText className="w-6 h-6 text-pink-300 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">BASES 2026</h3>
                <p className="text-xs text-gray-400 group-hover:text-pink-200 transition-colors">Descargar reglamento</p>
              </div>
            </a>

            <a
              href="/docs/autorizacion_menores.pdf"
              target="_blank"
              download
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 hover:border-[var(--primary)] hover:scale-[1.02] transition-all group shadow-lg shadow-black/20"
            >
              <div className="bg-white/10 p-2 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                <FileText className="w-6 h-6 text-pink-300 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">AUTORIZACIÓN</h3>
                <p className="text-xs text-gray-400 group-hover:text-pink-200 transition-colors">Menores de edad</p>
              </div>
            </a>

            <a
              href="/docs/autorizacion_mayores.pdf"
              target="_blank"
              download
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 hover:border-[var(--primary)] hover:scale-[1.02] transition-all group shadow-lg shadow-black/20"
            >
              <div className="bg-white/10 p-2 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                <FileText className="w-6 h-6 text-pink-300 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">AUTORIZACIÓN</h3>
                <p className="text-xs text-gray-400 group-hover:text-pink-200 transition-colors">Mayores de edad</p>
              </div>
            </a>
          </div>
        </div>

        {/* JUDGES SECTION */}
        <div className="w-full mb-16">
          <JudgesSection />
        </div>

        {/* Beneficial Cause Section */}
        <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="bg-gradient-to-r from-pink-500/10 via-white/5 to-pink-500/10 border border-pink-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
            <div className="text-left md:w-1/2">
              <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">EVENTO 100% BENEFICO</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Bailamos por una Causa</h3>
              <p className="text-pink-100/80 leading-relaxed mb-6">
                Desde <strong className="text-white">2015</strong>, todos los beneficios recaudados en este campeonato son donados íntegramente a la <strong className="text-white">Associació Contra el Càncer de La Vall d'Uixó</strong>.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Recaudado 2025</p>
                  <p className="text-2xl font-black text-[var(--primary)]">7.797€</p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Total (10 años)</p>
                  <p className="text-2xl font-black text-white">48.529€</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center md:justify-end">
              <div className="bg-white p-4 rounded-xl shadow-lg rotate-2 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="/logo-cancer-vall.png"
                  alt="Associació Contra el Càncer La Vall"
                  width={200}
                  height={80}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FAQ SECTION */}
        <div className="w-full mb-24">
          <FAQSection />
        </div>

        {/* AVAILABILITY SECTION */}
        <div className="w-full mb-24">
          <AvailabilitySection />
        </div>

        {/* Purchase Section Removed as per user request (Box Office Only) */}



      </main >

      <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
      <EventInfoModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} />
    </div >
  );
}
