-- Allow assigned technicians to update/reopen checklists on active jobs.
-- Fixes retries after a failed complete left completed_at set.

drop policy if exists "inspection_checklists: tech update own draft"
  on public.inspection_checklists;

create policy "inspection_checklists: tech update own draft"
  on public.inspection_checklists for update
  using (
    public.is_staff()
    and (
      public.is_dispatcher()
      or exists (
        select 1
        from public.jobs j
        where j.id = job_id
          and j.assigned_to = auth.uid()
          and j.status in ('travelling', 'on_site', 'awaiting_parts')
      )
    )
  );

-- Reopen checklists stuck complete on still-active jobs (retry after partial failure).
update public.inspection_checklists c
set
  status = 'in_progress',
  completed_at = null,
  inspection_id = null
from public.jobs j
where j.id = c.job_id
  and c.completed_at is not null
  and j.status in ('travelling', 'on_site', 'awaiting_parts')
  and j.assigned_to is not null;
