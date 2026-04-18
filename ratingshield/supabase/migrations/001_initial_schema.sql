-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  full_name text,
  stripe_customer_id text unique,
  plan text not null default 'trial' check (plan in ('trial','starter','growth','pro')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- ── BUSINESSES ─────────────────────────────────────────
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text,
  tone text not null default 'professional' check (tone in ('professional','friendly','formal')),
  avoid_phrases text,
  created_at timestamptz not null default now()
);

-- ── PLATFORMS ──────────────────────────────────────────
create table public.platforms (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  platform_name text not null check (platform_name in ('google','yelp','facebook')),
  external_id text not null,
  access_token text,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(business_id, platform_name)
);

-- ── REVIEWS ────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  external_review_id text not null,
  star_rating int not null check (star_rating between 1 and 5),
  reviewer_name text,
  review_text text,
  is_replied boolean not null default false,
  reviewed_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique(platform_id, external_review_id)
);

-- ── AI RESPONSES ───────────────────────────────────────
create table public.ai_responses (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references public.reviews(id) on delete cascade unique,
  draft_text text not null,
  posted_text text,
  status text not null default 'draft' check (status in ('draft','approved','posted')),
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

-- ── DIGEST EMAILS ──────────────────────────────────────
create table public.digest_emails (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period text not null,
  total_reviews int not null default 0,
  avg_rating numeric(3,2),
  summary_text text,
  sent_at timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────
alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.platforms enable row level security;
alter table public.reviews enable row level security;
alter table public.ai_responses enable row level security;
alter table public.digest_emails enable row level security;

-- Users can only read and update their own row
create policy "users: own row only" on public.users
  for all using (auth.uid() = id);

-- Users can only access their own businesses
create policy "businesses: owner only" on public.businesses
  for all using (
    user_id = auth.uid()
  );

-- Users can only access platforms belonging to their businesses
create policy "platforms: owner only" on public.platforms
  for all using (
    business_id in (
      select id from public.businesses where user_id = auth.uid()
    )
  );

-- Users can only access reviews from their platforms
create policy "reviews: owner only" on public.reviews
  for all using (
    platform_id in (
      select p.id from public.platforms p
      join public.businesses b on b.id = p.business_id
      where b.user_id = auth.uid()
    )
  );

-- Users can only access AI responses for their reviews
create policy "ai_responses: owner only" on public.ai_responses
  for all using (
    review_id in (
      select r.id from public.reviews r
      join public.platforms p on p.id = r.platform_id
      join public.businesses b on b.id = p.business_id
      where b.user_id = auth.uid()
    )
  );

-- Users can only access digest emails for their businesses
create policy "digest_emails: owner only" on public.digest_emails
  for all using (
    business_id in (
      select id from public.businesses where user_id = auth.uid()
    )
  );

-- ── INDEXES ────────────────────────────────────────────
create index idx_businesses_user_id on public.businesses(user_id);
create index idx_platforms_business_id on public.platforms(business_id);
create index idx_reviews_platform_id on public.reviews(platform_id);
create index idx_reviews_star_rating on public.reviews(star_rating);
create index idx_reviews_is_replied on public.reviews(is_replied);
create index idx_ai_responses_review_id on public.ai_responses(review_id);
create index idx_digest_emails_business_id on public.digest_emails(business_id);

-- ── TRIGGER: auto-create user row on signup ────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
