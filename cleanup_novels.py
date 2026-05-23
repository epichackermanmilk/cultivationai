#!/usr/bin/env python3
"""
cleanup_novels.py
=================
1. Delete novels with 0 chapters.
2. Find duplicates (same normalised title) and keep only the copy
   with the most chapters; delete the rest.

Run from the repo root:
    python cleanup_novels.py [--dry-run]
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv

NOVELS_DIR = Path(__file__).parent / "output" / "novels"


def normalise(title: str) -> str:
    """Lower-case, collapse whitespace, strip punctuation for comparison."""
    t = title.lower()
    t = re.sub(r"[^\w\s]", " ", t)   # remove punctuation
    t = re.sub(r"\s+", " ", t).strip()
    return t


def load_novels():
    records = []
    for path in sorted(NOVELS_DIR.glob("*.json")):
        if path.name.endswith(".tmp.json"):
            continue
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            records.append({
                "path":     path,
                "slug":     path.stem,
                "title":    data.get("title", ""),
                "author":   data.get("author", ""),
                "chapters": data.get("total_chapters", 0),
                "norm":     normalise(data.get("title", path.stem)),
            })
        except Exception as e:
            print(f"  [WARN] Could not read {path.name}: {e}")
    return records


def main():
    records = load_novels()
    print(f"Loaded {len(records)} novel files.\n")

    deleted = 0

    # ── Step 1: remove 0-chapter novels that have a better duplicate ─────────
    # (We'll also catch lone 0-chapter novels in the dedup step below)
    zero_chapter = [r for r in records if r["chapters"] == 0]
    print(f"Found {len(zero_chapter)} novel(s) with 0 chapters.")

    # ── Step 2: group by normalised title ────────────────────────────────────
    groups: dict[str, list] = defaultdict(list)
    for r in records:
        groups[r["norm"]].append(r)

    dupes_found = sum(1 for g in groups.values() if len(g) > 1)
    print(f"Found {dupes_found} duplicate group(s).\n")

    to_delete: list[Path] = []

    for norm, group in groups.items():
        if len(group) == 1:
            r = group[0]
            if r["chapters"] == 0:
                print(f"  [DELETE-ZERO]  {r['slug']}  (0 ch, no better copy)")
                to_delete.append(r["path"])
        else:
            # Sort: most chapters first; prefer non-zero
            group.sort(key=lambda r: r["chapters"], reverse=True)
            keeper = group[0]
            losers = group[1:]

            # If the best copy also has 0 chapters, delete all but keep one
            if keeper["chapters"] == 0:
                # Delete all but the first alphabetically
                losers = group[1:]  # already sorted; first is "best" (still 0)

            chapter_str = f"{keeper['chapters']} ch"
            print(f"  [KEEP]   {keeper['slug']:<60} {chapter_str}")
            for r in losers:
                print(f"  [DELETE] {r['slug']:<60} {r['chapters']} ch")
                to_delete.append(r["path"])

    print(f"\n{'DRY RUN — ' if DRY_RUN else ''}Deleting {len(to_delete)} file(s)...")

    for path in to_delete:
        if DRY_RUN:
            print(f"  (would delete) {path.name}")
        else:
            path.unlink()
            deleted += 1

    if not DRY_RUN:
        remaining = len(records) - deleted
        print(f"\nDone. Deleted {deleted} files. {remaining} novels remain.")
    else:
        print(f"\nDry run complete. {len(to_delete)} files would be deleted.")
        print("Re-run without --dry-run to actually delete.")


if __name__ == "__main__":
    main()
