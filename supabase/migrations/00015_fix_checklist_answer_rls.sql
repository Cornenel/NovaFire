-- Fix checklist answer RLS: allow writes until completed_at is set.
-- Also repairs checklists stuck "complete" without answers from the prior bug.

drop policy if exists "checklist_answers: tech write via checklist"
  on public.inspection_checklist_answers;
drop policy if exists "checklist_answers: tech update via checklist"
  on public.inspection_checklist_answers;

create policy "checklist_answers: tech insert via checklist"
  on public.inspection_checklist_answers for insert
  with check (
    public.is_staff()
    and exists (
      select 1
      from public.inspection_checklists c
      join public.jobs j on j.id = c.job_id
      where c.id = checklist_id
        and c.completed_at is null
        and (public.is_dispatcher() or j.assigned_to = auth.uid())
    )
  );

create policy "checklist_answers: tech update via checklist"
  on public.inspection_checklist_answers for update
  using (
    public.is_staff()
    and exists (
      select 1
      from public.inspection_checklists c
      join public.jobs j on j.id = c.job_id
      where c.id = checklist_id
        and c.completed_at is null
        and (public.is_dispatcher() or j.assigned_to = auth.uid())
    )
  );

-- Reopen checklists that were marked complete before answers could be saved.
update public.inspection_checklists c
set
  status = 'in_progress',
  completed_at = null,
  inspection_id = null
where c.completed_at is not null
  and not exists (
    select 1
    from public.inspection_checklist_answers a
    where a.checklist_id = c.id
  );

-- Allow checklist header updates until finalized (completed_at set).
drop policy if exists "inspection_checklists: tech update own draft"
  on public.inspection_checklists;

create policy "inspection_checklists: tech update own draft"
  on public.inspection_checklists for update
  using (
    public.is_staff()
    and (
      public.is_dispatcher()
      or (
        completed_at is null
        and exists (
          select 1
          from public.jobs j
          where j.id = job_id
            and j.assigned_to = auth.uid()
        )
      )
    )
  );
