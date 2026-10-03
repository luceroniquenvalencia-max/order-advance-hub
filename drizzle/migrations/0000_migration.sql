create type public.app_role as enum ('admin','asesor');
create type public.estado_solicitud as enum ('PENDIENTE','EN_VALIDACION','ATENDIDO','NO_ATENDIDO');

create table public.profiles (
  id uuid primary key,
  nombre text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)), new.email);
  if lower(new.email) in ('lniquenv@efe-lc.com.pe','fcarhuanco@efe.com.pe','jpelaezo@efe-lc.com.pe') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'asesor');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create sequence public.solicitud_seq start 1;

create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('SOL-' || lpad(nextval('public.solicitud_seq')::text, 5, '0')),
  created_at timestamptz not null default now(),
  asesor_id uuid not null default auth.uid(),
  asesor_nombre text not null,
  asesor_email text not null,
  numero_pedido text not null,
  fecha_solicitada date not null,
  motivo text not null,
  observacion_asesor text,
  estado estado_solicitud not null default 'PENDIENTE',
  fecha_atencion timestamptz,
  atendido_por text,
  comentario_atencion text,
  fecha_programada date,
  observacion_final text,
  updated_at timestamptz not null default now(),
  sheet_synced_at timestamptz
);
grant select, insert, update on public.solicitudes to authenticated;
grant usage on sequence public.solicitud_seq to authenticated;
grant all on public.solicitudes to service_role;
alter table public.solicitudes enable row level security;
create policy "asesor ve propias" on public.solicitudes for select to authenticated using (asesor_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "asesor crea" on public.solicitudes for insert to authenticated with check (asesor_id = auth.uid() and estado = 'PENDIENTE');
create policy "admin actualiza" on public.solicitudes for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.solicitud_historial (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  created_at timestamptz not null default now(),
  usuario_email text,
  accion text not null,
  estado_anterior estado_solicitud,
  estado_nuevo estado_solicitud,
  detalle text
);
grant select on public.solicitud_historial to authenticated;
grant all on public.solicitud_historial to service_role;
alter table public.solicitud_historial enable row level security;
create policy "historial read" on public.solicitud_historial for select to authenticated using (
  exists (select 1 from public.solicitudes s where s.id = solicitud_id and (s.asesor_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);

create or replace function public.log_solicitud()
returns trigger language plpgsql security definer set search_path = public as $$
declare _email text;
begin
  select email into _email from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.solicitud_historial (solicitud_id, usuario_email, accion, estado_nuevo, detalle)
    values (new.id, coalesce(_email, new.asesor_email), 'CREADA', new.estado, 'Solicitud registrada');
  else
    new.updated_at = now();
    insert into public.solicitud_historial (solicitud_id, usuario_email, accion, estado_anterior, estado_nuevo, detalle)
    values (new.id, coalesce(_email, 'sistema'), 'ACTUALIZADA', old.estado, new.estado, new.comentario_atencion);
  end if;
  return new;
end; $$;
create trigger solicitud_ins after insert on public.solicitudes for each row execute function public.log_solicitud();
create trigger solicitud_upd before update on public.solicitudes for each row execute function public.log_solicitud();

alter publication supabase_realtime add table public.solicitudes;