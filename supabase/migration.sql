-- Cazador de Palabras — Supabase migration
-- Ejecutar en: https://supabase.com/dashboard → SQL Editor → New query

-- ── Tabla de partidas globales ──
create table if not exists public.scores (
  id           uuid default gen_random_uuid() primary key,
  device_id    text not null,
  jugador      text not null,
  sala_code    text,
  cat          text not null,
  cat_nombre   text not null,
  nivel        integer not null,
  pts          integer not null,
  medalla      text,
  precision    integer not null,
  cazadas      integer not null,
  erradas      integer not null,
  tiempo_usado integer not null,
  combos       integer not null default 0,
  fecha        timestamptz default now()
);

-- ── Tabla de salas (docentes) ──
create table if not exists public.salas (
  code        text primary key,
  nombre      text not null,
  descripcion text,
  activa      boolean default true,
  created_at  timestamptz default now()
);

-- ── Row Level Security ──
alter table public.scores enable row level security;
alter table public.salas  enable row level security;

create policy "scores_insert" on public.scores for insert with check (true);
create policy "scores_select" on public.scores for select using (true);
create policy "salas_insert"  on public.salas  for insert with check (true);
create policy "salas_select"  on public.salas  for select using (true);

-- ── Índices ──
create index if not exists scores_pts_idx       on public.scores (pts desc);
create index if not exists scores_sala_idx      on public.scores (sala_code);
create index if not exists scores_device_idx    on public.scores (device_id);
create index if not exists scores_medalla_idx   on public.scores (medalla);
