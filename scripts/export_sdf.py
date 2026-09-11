"""LOCAL-ONLY recovery: SDF (SQL Server Compact) -> SQLite working copy.

Needs: pip install sqlce. SDF password lives in the vendor's own data-layer
DLL connection string (see docs/INVENTORY.md). Output is a local working
file — NEVER committed (see .gitignore). Corpus is a syllabus map, not
shippable content: questions are proprietary, translations would be
derivative works.
"""
import sqlite3
import sys

SDF_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/abc-msi/intrebari_pregatitoare.sdf"
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else "barabum1234"
OUT = sys.argv[3] if len(sys.argv) > 3 else "/tmp/dqdata/abc_ro.sqlite"

from sqlce import SqlceDatabase  # noqa: E402

db = SqlceDatabase(SDF_PATH, password=PASSWORD)
con = sqlite3.connect(OUT)
cur = con.cursor()
for table in db.list_tables():
    cols = [c.name for c in db.table_schema(table)]
    cur.execute("DROP TABLE IF EXISTS \"%s\"" % table)
    cur.execute("CREATE TABLE \"%s\" (%s)" % (table, ", ".join('"%s" TEXT' % c for c in cols)))
    rows = list(db.read_table(table))
    for row in rows:
        cur.execute(
            'INSERT INTO "%s" VALUES (%s)' % (table, ",".join("?" * len(cols))),
            [str(row.get(c, "")) for c in cols],
        )
    print(table, len(rows))
con.commit()
print("wrote", OUT)
