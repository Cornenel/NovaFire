-- Allow technicians to register assets on a site while assigned to an active job there.
-- Dispatchers retain full asset insert via existing policy.

create policy "assets: technician insert on assigned job site"
  on public.assets
  for insert
  with check (
    public.is_staff()
    and (
      public.is_dispatcher()
      or exists (
        select 1
        from public.jobs j
        where j.site_id = site_id
          and j.assigned_to = auth.uid()
          and j.status in ('travelling', 'on_site', 'awaiting_parts')
      )
    )
  );
