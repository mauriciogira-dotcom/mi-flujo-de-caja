'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardHome from '@/components/DashboardHome';
import AuthForm from '@/components/AuthForm';

/* ── Spinner de carga mientras se resuelve la sesión ── */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">Cargando...</p>
      </div>
    </div>
  );
}

export default function Home() {
  // undefined = aún resolviendo | null = no autenticado | objeto = sesión activa
  const [session,   setSession]   = useState(undefined);
  const [esPremium, setEsPremium] = useState(false);

  useEffect(() => {
    // Leer sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });

    // Escuchar cambios (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar estado premium cuando la sesión esté disponible
  useEffect(() => {
    if (!session?.user) {
      setEsPremium(false);
      return;
    }

    supabase
      .from('perfiles')
      .select('es_premium')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        setEsPremium(data?.es_premium ?? false);
      });
  }, [session]);

  // Detectar ?upgraded=true al montar (antes de que la sesión cargue)
  const [wasUpgraded, setWasUpgraded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setWasUpgraded(true);
      window.history.replaceState({}, '', '/'); // limpiar URL de inmediato
    }
  }, []); // solo una vez al montar

  // Cuando tengamos sesión Y veníamos de un pago, hacer polling hasta que es_premium=true
  useEffect(() => {
    if (!wasUpgraded || !session?.user) return;

    let intentos = 0;
    const verificar = () => {
      intentos++;
      supabase
        .from('perfiles')
        .select('es_premium')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.es_premium) {
            setEsPremium(true);
            setWasUpgraded(false);
          } else if (intentos < 10) {
            // Reintentar cada 3 s hasta 30 s (webhook puede tardar)
            setTimeout(verificar, 3000);
          }
        });
    };
    setTimeout(verificar, 1500); // primer chequeo a 1.5 s
  }, [wasUpgraded, session]);

  if (session === undefined) return <LoadingScreen />;

  return (
    <main>
      {session
        ? <DashboardHome session={session} esPremium={esPremium} />
        : <AuthForm />
      }
    </main>
  );
}
