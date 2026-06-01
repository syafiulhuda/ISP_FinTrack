import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <div className="max-lg:h-[100dvh] lg:min-h-screen w-full flex bg-background overflow-hidden font-sans">
      {/* Left side - Visual & Branding (Server Rendered) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary to-secondary relative p-16 flex-col justify-between overflow-hidden">
        <div 
          className="absolute -top-24 -left-24 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl animate-float"
        />
        <div 
          className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-primary-foreground/20 rounded-full blur-3xl animate-float-delayed"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-foreground flex items-center justify-center shadow-2xl">
            <span className="text-primary font-black text-2xl">IF</span>
          </div>
          <span className="text-2xl font-black text-primary-foreground tracking-tight">ISP-FinTrack</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <div>
            <h1 className="text-6xl font-black text-primary-foreground leading-[1.1] mb-6">
              Empowering <span className="opacity-80">ISP Growth</span> Through Data.
            </h1>
            <p className="text-primary-foreground/80 text-xl leading-relaxed font-medium">
              Enterprise-grade financial intelligence, income automation, and inventory control tailored for internet service providers.
            </p>
          </div>
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-primary-foreground">1.2B+</span>
              <span className="text-sm font-bold text-primary-foreground/60 uppercase tracking-widest text-[10px]">Monthly Revenue</span>
            </div>
            <div className="w-px h-12 bg-primary-foreground/10" />
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-primary-foreground">88%</span>
              <span className="text-sm font-bold text-primary-foreground/60 uppercase tracking-widest text-[10px]">Efficiency Gain</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-primary-foreground/60 text-sm font-bold">
          <ShieldCheck size={18} className="text-primary-foreground/80" />
          ISO 27001 Certified Enterprise Financial Platform
        </div>
      </div>

      {/* Right side - Form (Client Component) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-24 relative h-full">
        <div className="flex-1 flex flex-col justify-center w-full max-w-md">
          <LoginForm />
        </div>
        
        <div className="mt-4 lg:mt-8 flex flex-col items-center gap-2 pb-6 lg:pb-0 shrink-0">
          <div className="flex items-center gap-4 text-xs lg:text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              Kebijakan Privasi
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">
              Syarat & Ketentuan
            </Link>
          </div>
          <div className="lg:hidden text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            ISP-FinTrack Enterprise v2.4.0
          </div>
        </div>
      </div>
    </div>
  );
}
