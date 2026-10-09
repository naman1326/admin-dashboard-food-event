-- Food pass system: Participant bulk add and delete functions
-- Run this in the Supabase SQL editor to enable adding participants and deleting all participants from the admin dashboard.

-- 1. Function to bulk-add participants
create or replace function admin_add_participants(
  p_admin_password text,
  p_participants jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  item jsonb;
  v_count int := 0;
begin
  -- Validate password
  if p_admin_password is null or p_admin_password <> 'mgo2XHBobu8Y94t9' then
    raise exception 'unauthorized';
  end if;

  if jsonb_typeof(p_participants) <> 'array' then
    raise exception 'p_participants must be a JSON array';
  end if;

  for item in select * from jsonb_array_elements(p_participants)
  loop
    if item->>'reg_no' is not null and trim(item->>'reg_no') <> '' and exists (
      select 1 from participants where reg_no = trim(item->>'reg_no')
    ) then
      update participants
      set
        token = item->>'token',
        name = coalesce(nullif(trim(item->>'name'), ''), name),
        email = coalesce(nullif(trim(item->>'email'), ''), email)
      where reg_no = trim(item->>'reg_no');
    else
      insert into participants (token, name, reg_no, email)
      values (
        item->>'token',
        item->>'name',
        nullif(trim(item->>'reg_no'), ''),
        nullif(trim(item->>'email'), '')
      )
      on conflict (token) do update
      set
        name = excluded.name,
        reg_no = coalesce(excluded.reg_no, participants.reg_no),
        email = coalesce(excluded.email, participants.email);
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'ok', 'count', v_count);
end;
$$;

-- 2. Function to delete all participants (and scans + admin actions referencing them)
create or replace function admin_delete_all_participants(
  p_admin_password text
) returns jsonb
language plpgsql
security definer
as $$
begin
  -- Validate password
  if p_admin_password is null or p_admin_password <> 'mgo2XHBobu8Y94t9' then
    raise exception 'unauthorized';
  end if;

  -- Delete child tables first to satisfy foreign key constraints
  delete from scans where id is not null;
  begin
    delete from admin_actions where id is not null;
  exception when undefined_table then
    -- Table may not exist yet if 05_admin_actions wasn't run
    null;
  end;

  -- Delete all participants
  delete from participants where id is not null;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Grant permissions to anon role
grant execute on function admin_add_participants(text, jsonb) to anon;
grant execute on function admin_delete_all_participants(text) to anon;
