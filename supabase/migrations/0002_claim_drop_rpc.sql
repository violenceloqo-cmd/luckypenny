-- Atomic "claim a drop": if the user hasn't dropped in the cooldown window,
-- bump their last_drop_at to now() and return true; otherwise return false +
-- the remaining cooldown.
--
-- Race-safe because UPDATE with a WHERE clause is atomic in Postgres — two
-- concurrent calls cannot both succeed.

create or replace function public.claim_drop(
  p_user_id uuid,
  p_cooldown_seconds int
)
returns table (
  claimed   boolean,
  remaining_ms int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now       timestamptz := now();
  v_last      timestamptz;
  v_remaining int;
begin
  update public.users
     set last_drop_at = v_now
   where id = p_user_id
     and (last_drop_at is null
          or last_drop_at < v_now - make_interval(secs => p_cooldown_seconds))
  returning last_drop_at into v_last;

  if v_last is not null then
    claimed := true;
    remaining_ms := 0;
    return next;
    return;
  end if;

  select last_drop_at into v_last from public.users where id = p_user_id;
  v_remaining := greatest(
    0,
    p_cooldown_seconds * 1000
      - extract(epoch from (v_now - coalesce(v_last, v_now))) * 1000
  )::int;

  claimed := false;
  remaining_ms := v_remaining;
  return next;
end;
$$;

grant execute on function public.claim_drop(uuid, int) to anon, authenticated, service_role;
