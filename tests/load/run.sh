#!/bin/bash
# בדיקת עומס מקומית: מסד ריק, נתונים, ואז שלושה סוגי תנועה במקביל במשך 30 שניות כל אחד.
# שימוש: PGURL=... bash tests/load/run.sh
set -euo pipefail
cd "$(dirname "$0")"
psql "$PGURL" -q -v ON_ERROR_STOP=1 -f ../../supabase/tests/supabase_stub.sql
psql "$PGURL" -q -v ON_ERROR_STOP=1 -1 -f ../../supabase/setup.sql >/dev/null
psql "$PGURL" -q -v ON_ERROR_STOP=1 -1 -f seed.sql
for t in browse order engine; do
  echo "== $t"
  pgbench "$PGURL" -n -c 20 -j 2 -T 30 -f $t.sql -r 2>&1 | grep -E "tps|latency average|failed" | sed 's/(without initial connection time)//'
done
psql "$PGURL" -At -c "select 'orders: ' || count(*) || ', price mismatches: ' || count(*) filter (where total <> corder_price(winery_id, design)) from customer_orders"
psql "$PGURL" -At -c "select 'engine rows: ' || count(*) || ', pending left: ' || count(*) filter (where state = 'pending') from engine_usage"
