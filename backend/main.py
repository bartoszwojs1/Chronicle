from __future__ import annotations

import time
from datetime import datetime, timezone, timedelta
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from reader import read_chrome_history, _find_history_file
from analyzer import (
    get_hourly_heatmap,
    get_top_domains,
    get_category_breakdown,
    get_daily_trend,
    get_sessions,
    get_productivity_score,
    get_summary_stats,
)
from categories import categorize_domain

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Browser History Viz API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory cache ───────────────────────────────────────────────────────────

_CACHE_TTL_SECONDS = 60

class _Cache:
    df: Optional[pd.DataFrame] = None
    loaded_at: float = 0.0          # time.monotonic() timestamp

    def is_fresh(self) -> bool:
        return (
            self.df is not None
            and (time.monotonic() - self.loaded_at) < _CACHE_TTL_SECONDS
        )

    def store(self, df: pd.DataFrame) -> None:
        self.df = df
        self.loaded_at = time.monotonic()

    def invalidate(self) -> None:
        self.df = None
        self.loaded_at = 0.0


_cache = _Cache()


def _get_df() -> pd.DataFrame:
    """Return cached DataFrame, reloading from disk when cache is stale."""
    if _cache.is_fresh():
        return _cache.df  # type: ignore[return-value]

    df = read_chrome_history()          # raises FileNotFoundError if absent
    # Annotate category once, at load time, so all endpoints share it
    url_col   = df["url"]   if "url"   in df.columns else pd.Series([""] * len(df))
    title_col = df["title"] if "title" in df.columns else pd.Series([""] * len(df))
    df["category"] = [
        categorize_domain(d, url=u, title=t)
        for d, u, t in zip(df["domain"], url_col, title_col)
    ]
    _cache.store(df)
    return df


def _filter_days(df: pd.DataFrame, days: int) -> pd.DataFrame:
    """Return rows from the last `days` calendar days. 0 means no filter."""
    if days == 0:
        return df

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)

    def _parse(val) -> Optional[datetime]:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    mask = df["visited_at"].apply(lambda v: (_parse(v) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff)
    return df[mask]


# ── Helpers for 404 messaging ─────────────────────────────────────────────────

_NOT_FOUND_HELP = (
    "Chrome History file not found. "
    "Make sure Google Chrome is installed and has been opened at least once. "
    "On macOS the file lives at: "
    "~/Library/Application Support/Google/Chrome/Default/History"
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/status")
def get_status():
    """
    Check whether the Chrome History file is accessible.

    Returns:
        found        – true if the file exists and is readable
        path         – resolved filesystem path (or empty string)
        total_visits – row count from a fresh read (0 if not found)
        cache_age_s  – seconds since the DataFrame was last loaded (null = not loaded)
    """
    try:
        history_path = str(_find_history_file())
        found = True
    except FileNotFoundError:
        return {
            "found":        False,
            "path":         "",
            "total_visits": 0,
            "cache_age_s":  None,
        }

    total_visits = 0
    try:
        df = _get_df()
        total_visits = len(df)
    except Exception:
        pass

    cache_age = (
        round(time.monotonic() - _cache.loaded_at, 1)
        if _cache.df is not None
        else None
    )

    return {
        "found":        found,
        "path":         history_path,
        "total_visits": total_visits,
        "cache_age_s":  cache_age,
    }


@app.get("/api/stats")
def get_stats(
    days: int = Query(
        default=0,
        ge=0,
        description="Limit to last N days. 0 = all time. Supported: 7, 30, 90, 365, 0.",
    )
):
    """
    Return all analytics in one payload.

    Query params:
        days – 7 | 30 | 90 | 365 | 0 (default = 0, all time)
    """
    try:
        df_full = _get_df()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_HELP)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read history: {exc}")

    df = _filter_days(df_full, days)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No visits found in the last {days} days." if days else "History is empty.",
        )

    try:
        trend = get_daily_trend(df, days=days if days > 0 else 30)
        result = {
            "meta": {
                "days_filter":   days,
                "rows_returned": len(df),
                "generated_at":  datetime.now(tz=timezone.utc).isoformat(),
                "cache_age_s":   round(time.monotonic() - _cache.loaded_at, 1),
            },
            "summary":      get_summary_stats(df),
            "heatmap":      get_hourly_heatmap(df),
            "top_domains":  get_top_domains(df, n=15),
            "categories":   get_category_breakdown(df),
            "daily_trend":  trend,
            "sessions":     get_sessions(df, gap_minutes=30),
            "productivity": get_productivity_score(df),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}")

    return result


@app.get("/api/refresh")
def refresh_cache():
    """
    Invalidate the in-memory cache and reload the Chrome History file.

    Returns the new row count and timestamp.
    """
    _cache.invalidate()
    try:
        df = _get_df()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_HELP)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reload failed: {exc}")

    return {
        "refreshed":    True,
        "total_visits": len(df),
        "loaded_at":    datetime.now(tz=timezone.utc).isoformat(),
    }
