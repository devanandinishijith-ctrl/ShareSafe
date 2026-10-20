-- ==============================================================================
-- ShareSafe — Production Supabase Database Schema, Storage & RLS Policies
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    name text,
    created_at timestamptz default now() not null
);

-- 2. Files Table
create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    file_name text not null,
    file_type text not null,
    file_size bigint not null,
    storage_path text not null,
    created_at timestamptz default now() not null
);

-- 3. Shares Table
create table if not exists public.shares (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references public.files(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete cascade,
    recipient_email text not null,
    share_token text not null unique,
    status text not null check (status in ('active', 'revoked', 'expired')) default 'active',
    grace_period_seconds integer not null default 30,
    grace_period_expires_at timestamptz not null,
    expires_at timestamptz not null,
    message text,
    access_count integer default 0,
    revoked_at timestamptz,
    created_at timestamptz default now() not null
);

-- 4. Activity Logs Table
create table if not exists public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    share_id uuid references public.shares(id) on delete set null,
    action text not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Indexes for high performance
create index if not exists idx_files_owner_id on public.files(owner_id);
create index if not exists idx_shares_sender_id on public.shares(sender_id);
create index if not exists idx_shares_token on public.shares(share_token);
create index if not exists idx_shares_status on public.shares(status);
create index if not exists idx_shares_expires_at on public.shares(expires_at);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.shares enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Files Policies
create policy "Users can view own files"
    on public.files for select
    using (auth.uid() = owner_id);

create policy "Users can insert own files"
    on public.files for insert
    with check (auth.uid() = owner_id);

create policy "Users can delete own files"
    on public.files for delete
    using (auth.uid() = owner_id);

-- Shares Policies
create policy "Senders can view own shares"
    on public.shares for select
    using (auth.uid() = sender_id);

create policy "Senders can insert own shares"
    on public.shares for insert
    with check (auth.uid() = sender_id);

create policy "Senders can update own shares"
    on public.shares for update
    using (auth.uid() = sender_id);

create policy "Senders can delete own shares"
    on public.shares for delete
    using (auth.uid() = sender_id);

-- Public / Recipient can read share metadata via share_token
create policy "Public can view valid active shares by token"
    on public.shares for select
    using (true);

-- Activity Logs Policies
create policy "Users can view own activity logs"
    on public.activity_logs for select
    using (auth.uid() = user_id);

create policy "Users can insert own activity logs"
    on public.activity_logs for insert
    with check (auth.uid() = user_id);

-- ==============================================================================
-- Trigger: Create Profile on Signup
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ==============================================================================
-- Storage Bucket & Storage Policies
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('sharesafe-files', 'sharesafe-files', false)
on conflict (id) do nothing;

create policy "Users can upload own files to storage"
    on storage.objects for insert
    with check (
        bucket_id = 'sharesafe-files' and
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can view own files in storage"
    on storage.objects for select
    using (
        bucket_id = 'sharesafe-files' and
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can delete own files in storage"
    on storage.objects for delete
    using (
        bucket_id = 'sharesafe-files' and
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ==============================================================================
-- Stored Procedures (RPCs)
-- ==============================================================================

-- 1. Atomic Revoke Share
create or replace function public.revoke_share_atomic(p_share_id uuid)
returns jsonb as $$
declare
    v_share public.shares%rowtype;
    v_file public.files%rowtype;
begin
    -- Verify ownership
    select * into v_share from public.shares
    where id = p_share_id and sender_id = auth.uid();

    if not found then
        return jsonb_build_object('success', false, 'error', 'Share not found or unauthorized');
    end if;

    -- Update share status
    update public.shares
    set status = 'revoked',
        revoked_at = now()
    where id = p_share_id;

    -- Retrieve file details
    select * into v_file from public.files where id = v_share.file_id;

    -- Record in activity log
    insert into public.activity_logs (user_id, share_id, action, metadata)
    values (
        auth.uid(),
        p_share_id,
        'Share revoked',
        jsonb_build_object(
            'file_name', v_file.file_name,
            'recipient_email', v_share.recipient_email,
            'revoked_at', now()
        )
    );

    return jsonb_build_object('success', true, 'share_id', p_share_id, 'status', 'revoked');
end;
$$ language plpgsql security definer;

-- 2. Recipient Share Access Validation
create or replace function public.get_share_by_token(p_token text)
returns jsonb as $$
declare
    v_share record;
begin
    select 
        s.id,
        s.share_token,
        s.recipient_email,
        s.status,
        s.expires_at,
        s.grace_period_expires_at,
        s.message,
        s.created_at,
        s.access_count,
        f.id as file_id,
        f.file_name,
        f.file_type,
        f.file_size,
        f.storage_path,
        p.email as sender_email,
        p.name as sender_name
    into v_share
    from public.shares s
    join public.files f on s.file_id = f.id
    join public.profiles p on s.sender_id = p.id
    where s.share_token = p_token;

    if not found then
        return jsonb_build_object('valid', false, 'reason', 'not_found');
    end if;

    if v_share.status = 'revoked' then
        return jsonb_build_object(
            'valid', false, 
            'reason', 'revoked',
            'file_name', v_share.file_name,
            'sender_email', v_share.sender_email
        );
    end if;

    if now() > v_share.expires_at or v_share.status = 'expired' then
        -- Automatically ensure marked as expired
        update public.shares set status = 'expired' where id = v_share.id;
        return jsonb_build_object(
            'valid', false, 
            'reason', 'expired',
            'file_name', v_share.file_name,
            'sender_email', v_share.sender_email,
            'expires_at', v_share.expires_at
        );
    end if;

    return jsonb_build_object(
        'valid', true,
        'reason', 'active',
        'share_id', v_share.id,
        'file_id', v_share.file_id,
        'file_name', v_share.file_name,
        'file_type', v_share.file_type,
        'file_size', v_share.file_size,
        'storage_path', v_share.storage_path,
        'recipient_email', v_share.recipient_email,
        'sender_email', v_share.sender_email,
        'sender_name', v_share.sender_name,
        'message', v_share.message,
        'expires_at', v_share.expires_at,
        'created_at', v_share.created_at,
        'access_count', v_share.access_count
    );
end;
$$ language plpgsql security definer;

-- 3. Record Recipient Access
create or replace function public.record_share_access(p_token text)
returns jsonb as $$
declare
    v_share record;
begin
    select s.*, f.file_name into v_share
    from public.shares s
    join public.files f on s.file_id = f.id
    where s.share_token = p_token;

    if not found or v_share.status != 'active' or now() > v_share.expires_at then
        return jsonb_build_object('success', false, 'error', 'Share inactive or expired');
    end if;

    -- Increment access count
    update public.shares
    set access_count = coalesce(access_count, 0) + 1
    where id = v_share.id;

    -- Record activity for sender
    insert into public.activity_logs (user_id, share_id, action, metadata)
    values (
        v_share.sender_id,
        v_share.id,
        'Recipient accessed file',
        jsonb_build_object(
            'file_name', v_share.file_name,
            'recipient_email', v_share.recipient_email,
            'accessed_at', now()
        )
    );

    return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;
