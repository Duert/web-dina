"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Ticket, FileText, Camera, Instagram } from "lucide-react";
import { useState } from "react";
import { LocationModal } from "@/components/ui/location-modal";

export default function Home() {
  const [showLocationModal, setShowLocationModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black relative overflow-hidden">
      {/* Background Effect with Logo */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        {/* Using Next.js Image for better optimization and reliable loading */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-sm scale-110">
          <Image
            src="/logo-bg.png"
            alt="Dance in Action Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        {/* Gradient Overlay to fade it out */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
      </div>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center max-w-4xl text-center animate-in fade-in zoom-in duration-700">

        {/* LOGO TITLE */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,0,204,0.5)]">
            DANCE <span className="text-[var(--primary)] drop-shadow-[0_0_20px_rgba(255,0,204,0.8)]">IN</span> ACTION
          </h1>
          <p className="text-xl md:text-2xl text-pink-200 mt-4 font-light tracking-widest uppercase opacity-90">
            Campeonato Coreográfico de la Vall d'Uixó
          </p>
          <p className="text-lg md:text-xl text-pink-200 mt-2 font-light tracking-widest uppercase opacity-90">
            1 de Marzo 2026
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {/* Date and Contact Column */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex flex-col items-center hover:bg-white/10 transition-colors group flex-1 justify-center">
              <Calendar className="w-8 h-8 text-[var(--primary)] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-1">FECHA</h3>
              <p className="text-gray-400">1 Marzo 2026</p>
            </div>

            <a
              href="https://instagram.com/cc_danceinaction"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045] hover:border-transparent transition-all group"
            >
              <Instagram className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
              <div className="text-left">
                <h3 className="font-bold text-white text-xs">CONTACTO</h3>
                <p className="text-[10px] text-gray-400 group-hover:text-white/90">Instagram Direct</p>
              </div>
            </a>
          </div>

          {/* Center Column with Registration and Location */}
          <div className="flex flex-col gap-4">
            {/* Registration Button */}
            <Link
              href="/registration"
              className="w-full bg-[var(--primary)] border-2 border-[var(--primary)] p-4 rounded-2xl flex items-center justify-center gap-4 hover:bg-pink-600 hover:scale-[1.02] transition-all group shadow-[0_0_20px_rgba(255,0,204,0.3)]"
            >
              <Ticket className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h3 className="font-black text-white text-lg leading-none">INSCRIPCIONES</h3>
                <p className="text-pink-100 text-xs font-medium">Registra tu grupo ahora</p>
              </div>
            </Link>

            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex flex-col items-center hover:bg-white/10 hover:border-[var(--primary)]/50 transition-all group cursor-pointer"
            >
              <MapPin className="w-8 h-8 text-[var(--primary)] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-1">LUGAR</h3>
              <p className="text-gray-400 text-sm leading-tight">Auditorio Leopoldo Peñaroja<br /><span className="text-xs opacity-70">La Vall d'Uixó</span></p>
            </button>
          </div>

          {/* Downloads Column */}
          <div className="flex flex-col gap-4">
            <a
              href="/docs/bases.pdf"
              target="_blank"
              download
              className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-[var(--primary)] transition-all group"
            >
              <FileText className="w-6 h-6 text-pink-300 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">DESCARGAR BASES</h3>
                <p className="text-xs text-gray-400">PDF Oficial</p>
              </div>
            </a>

            <a
              href="/docs/autorizacion.pdf"
              target="_blank"
              download
              className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-[var(--primary)] transition-all group"
            >
              <Camera className="w-6 h-6 text-pink-300 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">AUTORIZACIÓN IMAGEN</h3>
                <p className="text-xs text-gray-400">Para menores</p>
              </div>
            </a>
          </div>
        </div>

        {/* Beneficial Cause Section */}
        <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="bg-gradient-to-r from-pink-500/10 via-white/5 to-pink-500/10 border border-pink-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
            <div className="text-left md:w-1/2">
              <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">EVENTO 100% BENEFICO</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Bailamos por una Causa</h3>
              <p className="text-pink-100/80 leading-relaxed">
                Todos los beneficios recaudados en este campeonato serán donados íntegramente a la <strong className="text-white">Associació Contra el Càncer de La Vall d'Uixó</strong>. Tu participación ayuda a la investigación y el apoyo a pacientes.
              </p>
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

        {/* Sessions Actions */}
        <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-center">
          <Link
            href="/session/morning"
            className="group relative px-8 py-4 bg-black/50 border-2 border-[var(--primary)] text-[var(--primary)] font-bold text-lg rounded-full overflow-hidden transition-all hover:bg-[var(--primary)] hover:text-white hover:scale-105 w-full md:w-64 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center">
              <span>SESIÓN MAÑANA</span>
              <span className="text-xs font-normal opacity-90 mt-1">10:00h</span>
            </div>
          </Link>


          <Link
            href="/session/afternoon"
            className="group relative px-8 py-4 bg-[var(--primary)] text-white font-bold text-lg rounded-full overflow-hidden transition-all hover:bg-pink-600 hover:scale-105 shadow-[0_0_20px_rgba(255,0,204,0.3)] hover:shadow-[0_0_40px_rgba(255,0,204,0.6)] w-full md:w-64"
          >
            <div className="flex flex-col items-center">
              <span>SESIÓN TARDE</span>
              <span className="text-xs font-normal opacity-90 mt-1">15:30h</span>
            </div>
          </Link>
        </div>



      </main >

      <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
    </div >
  );
}
