
-- Roles enum
create type public.app_role as enum ('admin', 'teacher', 'student');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'student',
  unique (user_id, role)
);

-- Classes table
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  teacher_id uuid references auth.users(id) on delete set null,
  location_lat double precision,
  location_lng double precision,
  location_radius integer default 100,
  created_at timestamptz default now()
);

-- Class students junction
create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique (class_id, student_id)
);

-- Attendance sessions
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  teacher_id uuid references auth.users(id) on delete set null,
  qr_token text unique,
  session_date date not null default current_date,
  started_at timestamptz default now(),
  ended_at timestamptz,
  is_active boolean default true
);

-- Attendance records
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.attendance_sessions(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'present' check (status in ('present', 'absent', 'late')),
  marked_at timestamptz default now(),
  latitude double precision,
  longitude double precision,
  location_verified boolean default false,
  unique (session_id, student_id)
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'student'));
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies

-- Profiles
create policy "Anyone can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid());

-- User roles
create policy "Anyone can view roles" on public.user_roles for select to authenticated using (true);
create policy "Admins can insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Classes
create policy "Anyone can view classes" on public.classes for select to authenticated using (true);
create policy "Admins can insert classes" on public.classes for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update classes" on public.classes for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete classes" on public.classes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Class students
create policy "Anyone can view class students" on public.class_students for select to authenticated using (true);
create policy "Admins can add class students" on public.class_students for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can remove class students" on public.class_students for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Attendance sessions
create policy "Anyone can view sessions" on public.attendance_sessions for select to authenticated using (true);
create policy "Teachers can create sessions" on public.attendance_sessions for insert to authenticated with check (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));
create policy "Teachers can update sessions" on public.attendance_sessions for update to authenticated using (teacher_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Attendance records
create policy "Anyone can view records" on public.attendance_records for select to authenticated using (true);
create policy "Anyone can insert records" on public.attendance_records for insert to authenticated with check (true);
create policy "Teachers can update records" on public.attendance_records for update to authenticated using (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));
