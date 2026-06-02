"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/actions/admin";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: adminProfile, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile,
    // Cek sesinya setiap 30 detik untuk deteksi force logout / revoke session
    refetchInterval: 30000, 
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // Jika tidak loading dan ID = 0 (artinya sesi di database sudah tidak ada / di-revoke)
    if (!isLoading && adminProfile && adminProfile.id === 0) {
      // Jangan menendang jika sedang di halaman login/logout
      if (pathname !== '/login' && pathname !== '/logout' && !pathname.startsWith('/reset-password')) {
        router.push('/login');
      }
    }
  }, [adminProfile, isLoading, pathname, router]);

  // Sembunyikan konten sementara jika sedang mengecek sesi agar tidak ada kedipan UI (FOUC)
  // Untuk transisi lebih mulus, kita bisa biarkan children render tapi jika id === 0, 
  // useEffect akan segera me-redirect
  
  if (adminProfile && adminProfile.id === 0) {
    return null; // Mencegah halaman asli terlihat sesaat sebelum redirect
  }

  return <>{children}</>;
}
