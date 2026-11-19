#!/bin/bash
# מריץ את בדיקות ההרשאה על מסד ריק. צריך PGURL שמצביע על Postgres נקי.
set -euo pipefail
cd "$(dirname "$0")/.."
psql "$PGURL" -q -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
psql "$PGURL" -q -v ON_ERROR_STOP=1 -1 -f setup.sql
psql "$PGURL" -q -v ON_ERROR_STOP=1 -1 -f setup.sql        # פעם שנייה: ההקמה חייבת להיות בטוחה להרצה חוזרת
psql "$PGURL" -q -v ON_ERROR_STOP=1 -f tests/rls_test.sql
