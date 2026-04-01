from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from collections import defaultdict

import pandas as pd

from categories import categorize_domain

# ── Per-category colors ────────────────────────────────────────────────────────
COLOR_MAP: dict[str, str] = {
    "work":          "#4ADE80",
    "learning":      "#818CF8",
    "entertainment": "#F472B6",
    "gaming":        "#FB923C",
    "social":        "#38BDF8",
    "ai_tools":      "#A78BFA",
    "news":          "#94A3B8",
    "productivity":  "#34D399",
    "shopping":      "#FBBF24",
    "finance":       "#10B981",
    "health":        "#F87171",
    "other":         "#64748B",
}

# Human-friendly Polish labels
CATEGORY_LABELS: dict[str, str] = {
    "work":          "Praca",
    "learning":      "Nauka",
    "entertainment": "Rozrywka",
    "gaming":        "Gaming",
    "social":        "Social",
    "ai_tools":      "AI Tools",
    "news":          "Wiadomości",
    "productivity":  "Produktywność",
    "shopping":      "Zakupy",
    "finance":       "Finanse",
    "health":        "Zdrowie",
    "other":         "Inne",
}

DAY_PL: dict[str, str] = {
    "Monday": "Poniedziałek",
    "Tuesday": "Wtorek",
    "Wednesday": "Środa",
    "Thursday": "Czwartek",
    "Friday": "Piątek",
    "Saturday": "Sobota",
    "Sunday": "Niedziela",
}


def _ensure_category(df: pd.DataFrame) -> pd.DataFrame:
    """Add 'category' column if absent, using categorize_domain."""
    if "category" not in df.columns:
        url_col = df["url"] if "url" in df.columns else pd.Series([""] * len(df))
        title_col = df["title"] if "title" in df.columns else pd.Series([""] * len(df))
        df = df.copy()
        df["category"] = [
            categorize_domain(d, url=u, title=t)
            for d, u, t in zip(df["domain"], url_col, title_col)
        ]
    return df


# ── 1. Hourly heatmap ─────────────────────────────────────────────────────────

def get_hourly_heatmap(df: pd.DataFrame) -> dict[int, dict[int, int]]:
    """
    Returns a 7×24 grid of visit counts.

    Keys: 0–6  (Monday=0 … Sunday=6, matching Python's datetime.weekday())
    Values: dict with keys 0–23 (hours), values = visit count.
    All cells are included even if count is 0.
    """
    # Initialise with zeros
    grid: dict[int, dict[int, int]] = {
        day: {hour: 0 for hour in range(24)}
        for day in range(7)
    }

    for _, row in df.iterrows():
        dt = row.get("visited_at")
        if dt is None or (isinstance(dt, float)):
            continue
        if isinstance(dt, str):
            try:
                dt = datetime.fromisoformat(dt)
            except ValueError:
                continue
        grid[dt.weekday()][dt.hour] += 1

    return grid


# ── 2. Top domains ────────────────────────────────────────────────────────────

def get_top_domains(df: pd.DataFrame, n: int = 15) -> list[dict]:
    """
    Returns the top-n domains by visit count.

    Each entry: {domain, count, category, color}
    """
    df = _ensure_category(df)
    counts = df.groupby("domain").agg(
        count=("domain", "count"),
        category=("category", lambda s: s.mode()[0] if len(s) else "other"),
    ).reset_index()

    counts = counts.sort_values("count", ascending=False).head(n)

    result = []
    for _, row in counts.iterrows():
        cat = row["category"]
        result.append({
            "domain":   row["domain"],
            "count":    int(row["count"]),
            "category": cat,
            "color":    COLOR_MAP.get(cat, COLOR_MAP["other"]),
        })
    return result


# ── 3. Category breakdown ─────────────────────────────────────────────────────

def get_category_breakdown(df: pd.DataFrame) -> list[dict]:
    """
    Returns per-category stats, only for categories with count > 0.

    Each entry: {category, count, percentage, color, label}
    """
    df = _ensure_category(df)
    total = len(df)
    if total == 0:
        return []

    counts = df["category"].value_counts()
    result = []
    for cat, count in counts.items():
        if count == 0:
            continue
        result.append({
            "category":   cat,
            "count":      int(count),
            "percentage": round(count / total * 100, 1),
            "color":      COLOR_MAP.get(cat, COLOR_MAP["other"]),
            "label":      CATEGORY_LABELS.get(cat, cat),
        })

    result.sort(key=lambda x: x["count"], reverse=True)
    return result


# ── 4. Daily trend ────────────────────────────────────────────────────────────

def get_daily_trend(
    df: pd.DataFrame,
    days: int = 30,
) -> dict[str, list[dict]]:
    """
    Returns daily visit counts for the last `days` days plus 7-day rolling avg.

    Returns:
        {
          "daily": [{date, count, day_name}, ...],
          "rolling_7d": [{date, avg}, ...]
        }
    Missing days are filled with count=0.
    """
    df = df.copy()

    # Normalise visited_at to date
    def _to_date(val) -> date | None:
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val).date()
            except ValueError:
                return None
        return None

    df["_date"] = df["visited_at"].apply(_to_date)
    df = df.dropna(subset=["_date"])

    today = datetime.now(tz=timezone.utc).date()
    start = today - timedelta(days=days - 1)

    all_dates = [start + timedelta(days=i) for i in range(days)]
    counts_map = df.groupby("_date").size().to_dict()

    daily = []
    for d in all_dates:
        daily.append({
            "date":     d.isoformat(),
            "count":    counts_map.get(d, 0),
            "day_name": d.strftime("%A"),
        })

    # 7-day rolling average
    rolling: list[dict] = []
    for i, entry in enumerate(daily):
        window = daily[max(0, i - 6): i + 1]
        avg = sum(e["count"] for e in window) / len(window)
        rolling.append({"date": entry["date"], "avg": round(avg, 1)})

    return {"daily": daily, "rolling_7d": rolling}


# ── 5. Sessions ───────────────────────────────────────────────────────────────

def get_sessions(
    df: pd.DataFrame,
    gap_minutes: int = 30,
) -> list[dict]:
    """
    Detect browsing sessions (gap > gap_minutes ends a session).

    Returns last 50 sessions, newest first.
    Each entry:
        {start, end, duration_minutes, visit_count, top_domain, categories}
    """
    df = _ensure_category(df)
    df = df.copy()

    def _to_dt(val) -> datetime | None:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    df["_dt"] = df["visited_at"].apply(_to_dt)
    df = df.dropna(subset=["_dt"]).sort_values("_dt")

    if df.empty:
        return []

    gap = timedelta(minutes=gap_minutes)
    sessions: list[dict] = []
    session_rows: list[pd.Series] = []

    prev_dt: datetime | None = None

    for _, row in df.iterrows():
        dt = row["_dt"]
        if prev_dt is None or (dt - prev_dt) > gap:
            if session_rows:
                sessions.append(_build_session(session_rows))
            session_rows = [row]
        else:
            session_rows.append(row)
        prev_dt = dt

    if session_rows:
        sessions.append(_build_session(session_rows))

    sessions.sort(key=lambda s: s["start"], reverse=True)
    return sessions[:50]


def _build_session(rows: list[pd.Series]) -> dict:
    dts = [r["_dt"] for r in rows]
    start = min(dts)
    end = max(dts)
    duration = int((end - start).total_seconds() / 60)

    domain_counts: dict[str, int] = defaultdict(int)
    cat_counts: dict[str, int] = defaultdict(int)
    for r in rows:
        domain_counts[r.get("domain", "")] += 1
        cat_counts[r.get("category", "other")] += 1

    top_domain = max(domain_counts, key=domain_counts.__getitem__, default="")
    total = len(rows)
    categories = {
        cat: round(cnt / total * 100, 1)
        for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1])
    }

    return {
        "start":             start.isoformat(),
        "end":               end.isoformat(),
        "duration_minutes":  duration,
        "visit_count":       total,
        "top_domain":        top_domain,
        "categories":        categories,
    }


# ── 6. Productivity score ─────────────────────────────────────────────────────

def get_productivity_score(df: pd.DataFrame) -> dict:
    """
    Compute a productivity score 0–100.

    score = (work + learning) / total * 100

    Returns:
        score, work_pct, learning_pct, entertainment_pct, other_pct,
        by_hour: [{hour, score}] × 24,
        weekly_trend: [{date, score}] × last 30 days,
        grade: "A" / "B" / "C" / "D"
    """
    df = _ensure_category(df)

    def _pct(mask: pd.Series) -> float:
        total = len(df)
        return round(mask.sum() / total * 100, 1) if total else 0.0

    work_mask  = df["category"] == "work"
    learn_mask = df["category"] == "learning"
    ent_mask   = df["category"] == "entertainment"
    other_mask = ~(work_mask | learn_mask | ent_mask)

    score = round(float((work_mask | learn_mask).sum() / max(len(df), 1) * 100), 1)

    # By-hour breakdown
    by_hour: list[dict] = []
    for hour in range(24):
        hour_df = df[df["hour"] == hour] if "hour" in df.columns else df
        if len(hour_df) == 0:
            by_hour.append({"hour": hour, "score": 0.0})
            continue
        prod = ((hour_df["category"] == "work") | (hour_df["category"] == "learning")).sum()
        by_hour.append({"hour": hour, "score": round(prod / len(hour_df) * 100, 1)})

    # Weekly trend (last 30 days)
    def _to_date(val) -> date | None:
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val).date()
            except ValueError:
                return None
        return None

    df = df.copy()
    df["_date"] = df["visited_at"].apply(_to_date)
    today = datetime.now(tz=timezone.utc).date()
    weekly_trend: list[dict] = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        day_df = df[df["_date"] == d]
        if len(day_df) == 0:
            weekly_trend.append({"date": d.isoformat(), "score": 0.0})
        else:
            prod = ((day_df["category"] == "work") | (day_df["category"] == "learning")).sum()
            weekly_trend.append({"date": d.isoformat(), "score": round(prod / len(day_df) * 100, 1)})

    grade = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"

    return {
        "score":              score,
        "work_pct":           _pct(work_mask),
        "learning_pct":       _pct(learn_mask),
        "entertainment_pct":  _pct(ent_mask),
        "other_pct":          _pct(other_mask),
        "by_hour":            by_hour,
        "weekly_trend":       weekly_trend,
        "grade":              grade,
    }


# ── 7. Summary stats ──────────────────────────────────────────────────────────

def get_summary_stats(df: pd.DataFrame) -> dict:
    """Return a comprehensive summary dict over the entire history DataFrame."""
    df = _ensure_category(df)

    if df.empty:
        return {"error": "No data"}

    total_visits   = len(df)
    unique_domains = int(df["domain"].nunique())
    unique_urls    = int(df["url"].nunique()) if "url" in df.columns else 0

    # Normalise timestamps
    def _to_dt(val) -> datetime | None:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    df = df.copy()
    df["_dt"] = df["visited_at"].apply(_to_dt)
    df_valid = df.dropna(subset=["_dt"])

    first_visit: str = ""
    last_visit: str  = ""
    date_range_days  = 0

    if not df_valid.empty:
        first_dt = df_valid["_dt"].min()
        last_dt  = df_valid["_dt"].max()
        first_visit = first_dt.isoformat()
        last_visit  = last_dt.isoformat()
        date_range_days = max((last_dt - first_dt).days, 1)

    # Daily visit counts
    def _d(val) -> date | None:
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val).date()
            except ValueError:
                return None
        return None

    df["_date"] = df["visited_at"].apply(_d)
    daily_counts = df.groupby("_date").size()
    avg_daily    = round(float(daily_counts.mean()), 1) if not daily_counts.empty else 0.0
    median_daily = round(float(daily_counts.median()), 1) if not daily_counts.empty else 0.0

    # Busiest hour / day
    busiest_hour: int = 0
    busiest_day       = "Monday"
    busiest_day_pl    = "Poniedziałek"

    if "hour" in df.columns and df["hour"].notna().any():
        busiest_hour = int(df["hour"].value_counts().idxmax())

    if "day_of_week_name" in df.columns and df["day_of_week_name"].notna().any():
        busiest_day    = str(df["day_of_week_name"].value_counts().idxmax())
        busiest_day_pl = DAY_PL.get(busiest_day, busiest_day)

    # Sessions (for longest / avg duration)
    sessions = get_sessions(df, gap_minutes=30)
    longest_session  = max((s["duration_minutes"] for s in sessions), default=0)
    avg_session_min  = round(
        sum(s["duration_minutes"] for s in sessions) / max(len(sessions), 1), 1
    )

    # Top category & domain
    top_category = df["category"].value_counts().idxmax() if not df.empty else "other"
    top_domain   = df["domain"].value_counts().idxmax()   if not df.empty else ""

    # Week-over-week
    today = datetime.now(tz=timezone.utc).date()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)

    visits_this_week = int((df["_date"] >= this_week_start).sum())
    visits_last_week = int(
        ((df["_date"] >= last_week_start) & (df["_date"] < this_week_start)).sum()
    )
    if visits_last_week > 0:
        wow_change = round((visits_this_week - visits_last_week) / visits_last_week * 100, 1)
    else:
        wow_change = 0.0

    return {
        "total_visits":              total_visits,
        "unique_domains":            unique_domains,
        "unique_urls":               unique_urls,
        "avg_daily_visits":          avg_daily,
        "median_daily_visits":       median_daily,
        "busiest_hour":              busiest_hour,
        "busiest_hour_label":        f"{busiest_hour:02d}:00",
        "busiest_day":               busiest_day,
        "busiest_day_pl":            busiest_day_pl,
        "date_range_days":           date_range_days,
        "first_visit":               first_visit,
        "last_visit":                last_visit,
        "longest_session_minutes":   longest_session,
        "avg_session_minutes":       avg_session_min,
        "top_category":              top_category,
        "top_domain":                top_domain,
        "visits_this_week":          visits_this_week,
        "visits_last_week":          visits_last_week,
        "week_over_week_change_pct": wow_change,
    }
