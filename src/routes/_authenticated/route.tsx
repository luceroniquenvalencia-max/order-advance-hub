import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LogOut, Truck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const linkCls = "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent";
  const active = { className: "bg-sidebar-accent text-sidebar-primary" };

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-sidebar px-4 py-3 text-sidebar-foreground md:h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:p-4">
        <div className="flex items-center gap-2 font-display font-bold md:mb-6">
          <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Truck className="size-4" /></span>
          <span className="hidden sm:inline">Pedidos</span>
        </div>
        <nav className="flex gap-1 md:flex-col">
          <Link to="/pedidos-del-dia" className={linkCls} activeProps={active}><ClipboardList className="size-4" /><span className="hidden sm:inline">Pedidos del día</span></Link>
        </nav>
        <div className="flex items-center gap-2 md:mt-auto md:flex-col md:items-stretch md:border-t md:border-sidebar-border md:pt-4">
          {me && (
            <div className="hidden text-xs md:block">
              <div className="flex items-center gap-1 font-semibold">
                {me.isAdmin && <ShieldCheck className="size-3 text-sidebar-primary" />}
                {me.isAdmin ? "Administrador" : "Usuario"}
              </div>
              <div className="truncate text-sidebar-foreground/60">{me.email}</div>
            </div>
          )}
          <button onClick={signOut} className={linkCls} aria-label="Cerrar sesión"><LogOut className="size-4" /><span className="hidden md:inline">Salir</span></button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
