import os
import sys

# Ensure backend directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, init_db
from app.core.seeder import seed_database_comprehensive
from app.models.case import Case

def main():
    print("Initializing DB schemas...")
    init_db()
    db = SessionLocal()
    try:
        print("Running comprehensive seeder...")
        res = seed_database_comprehensive(db)
        print("Seeding summary:", res)
        cases = db.query(Case).all()
        print(f"\nSuccessfully populated {len(cases)} Investigation Cases:")
        for c in cases:
            print(f"  • [{c.priority}] {c.case_number}: {c.title}")
            print(f"    - Category: {c.crime_category} | Stage: {c.stage} | Status: {c.status}")
            print(f"    - Evidence Records: {len(c.evidence_items)} | Notes: {len(c.notes)} | Team: {len(c.assignments)}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
