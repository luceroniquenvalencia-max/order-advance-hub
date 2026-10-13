CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _e text := lower(new.email); _n text;
begin
  _n := case _e
    when 'agomezr@lacuracao.com.pe' then 'Andrea Gomez'
    when 'jmoran@lacuracao.com.pe' then 'Julio Moran'
    when 'sbonarriba@efe-lc.com.pe' then 'Sandra Bonarriba'
    when 'rnunezp@efe-lc.com.pe' then 'Rocio Nuñez'
    when 'rportocarrero@lacuracao.com.pe' then 'Renato Portocarrero'
    when 'yrodriguez@efe-lc.com.pe' then 'Yvan Rodriguez'
    when 'mcespedes@lacuracao.com.pe' then 'Maria A. Cespedes'
    when 'sinchaustegui@lacuracao.com.pe' then 'Samantha Inchaustegui'
    when 'mcubasr@efe-lc.com.pe' then 'Irene Cubas'
    when 'fcarhuanco@efe.com.pe' then split_part(_e,'@',1)
    when 'lniquenv@efe-lc.com.pe' then split_part(_e,'@',1)
    else null end;
  if _n is null then
    raise exception 'Correo no autorizado';
  end if;
  insert into public.profiles (id, nombre, email) values (new.id, _n, new.email);
  if _e in ('fcarhuanco@efe.com.pe','lniquenv@efe-lc.com.pe') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'asesor');
  end if;
  return new;
end; $function$;

DELETE FROM public.user_roles ur USING public.profiles p
 WHERE ur.user_id = p.id AND ur.role = 'admin'
   AND lower(p.email) NOT IN ('fcarhuanco@efe.com.pe','lniquenv@efe-lc.com.pe');