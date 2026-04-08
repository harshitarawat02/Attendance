
drop policy "Anyone can insert records" on public.attendance_records;
create policy "Users can insert own records" on public.attendance_records for insert to authenticated with check (student_id = auth.uid());
