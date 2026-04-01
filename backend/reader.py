from __future__ import annotations

import os
import sys
import shutil
import sqlite3
import tempfile
import platform
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


WEBKIT_EPOCH_OFFSET = 11644473600  # seconds between 1601-01-01 and 1970-01-01


def _webkit_to_datetime(webkit_ts: int) -> datetime:
    """Convert WebKit timestamp (microseconds since 1601-01-01) to UTC datetime."""
    if not webkit_ts:
        return None
    unix_ts = webkit_ts / 1_000_000 - WEBKIT_EPOCH_OFFSET
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc)


def _get_default_chrome_paths() -> list[Path]:
    """Return ordered list of candidate Chrome History file paths for the current OS."""
    system = platform.system()

    if system == "Darwin":
        base = Path.home() / "Library" / "Application Support"
        candidates = [
            base / "Google" / "Chrome" / "Default" / "History",
            base / "Google" / "Chrome" / "Profile 1" / "History",
            base / "Chromium" / "Default" / "History",
            base / "Google" / "Chrome Beta" / "Default" / "History",
            base / "Google" / "Chrome Canary" / "Default" / "History",
            base / "Microsoft Edge" / "Default" / "History",
        ]

    elif system == "Windows":
        local_app_data = Path(os.environ.get("LOCALAPPDATA", ""))
        app_data = Path(os.environ.get("APPDATA", ""))
        candidates = [
            local_app_data / "Google" / "Chrome" / "User Data" / "Default" / "History",
            local_app_data / "Google" / "Chrome" / "User Data" / "Profile 1" / "History",
            local_app_data / "Chromium" / "User Data" / "Default" / "History",
            local_app_data / "Google" / "Chrome Beta" / "User Data" / "Default" / "History",
            local_app_data / "Microsoft" / "Edge" / "User Data" / "Default" / "History",
            app_data / "Google" / "Chrome" / "User Data" / "Default" / "History",
        ]

    elif system == "Linux":
        base = Path.home()
        candidates = [
            base / ".config" / "google-chrome" / "Default" / "History",
            base / ".config" / "google-chrome" / "Profile 1" / "History",
            base / ".config" / "chromium" / "Default" / "History",
            base / ".config" / "google-chrome-beta" / "Default" / "History",
            base / "snap" / "chromium" / "current" / ".config" / "chromium" / "Default" / "History",
            base / ".config" / "microsoft-edge" / "Default" / "History",
        ]

    else:
        candidates = []

    return candidates


def _find_history_file() -> Path:
    """Locate the Chrome History file, trying all known paths."""
    candidates = _get_default_chrome_paths()

    for path in candidates:
        if path.exists():
            return path

    # Build a human-readable list for the error message
    tried = "\n  ".join(str(p) for p in candidates)
    raise FileNotFoundError(
        f"Chrome History file not found. Tried the following paths:\n  {tried}\n\n"
        "Make sure Google Chrome (or Chromium) is installed and has been opened at least once."
    )


def read_chrome_history(history_path: str | Path | None = None) -> pd.DataFrame:
    """
    Read Google Chrome browsing history and return a tidy DataFrame.

    Parameters
    ----------
    history_path : str | Path | None
        Explicit path to the Chrome ``History`` SQLite file.
        If *None* (default), the function auto-detects the file based on the OS.

    Returns
    -------
    pd.DataFrame
        Columns:
        - url          : full URL string
        - title        : page title (may be empty)
        - domain       : registered domain extracted from the URL
        - visited_at   : timezone-aware UTC datetime of the visit
        - hour         : hour of the visit (0-23)
        - weekday      : ISO weekday number (1=Monday … 7=Sunday)
        - day_of_week_name : full English weekday name ("Monday" … "Sunday")

    Raises
    ------
    FileNotFoundError
        If the History file cannot be found at the default or supplied path.
    """
    # Resolve the path
    if history_path is None:
        source = _find_history_file()
    else:
        source = Path(history_path)
        if not source.exists():
            raise FileNotFoundError(f"Provided Chrome History path does not exist: {source}")

    # Copy to a temp file to bypass Chrome's exclusive file lock
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".sqlite", prefix="chrome_history_")
    os.close(tmp_fd)
    try:
        shutil.copy2(source, tmp_path)

        con = sqlite3.connect(tmp_path)
        try:
            query = """
                SELECT
                    u.url,
                    u.title,
                    v.visit_time
                FROM visits v
                JOIN urls u ON u.id = v.url
                WHERE v.visit_time > 0
                ORDER BY v.visit_time DESC
            """
            rows = con.execute(query).fetchall()
        finally:
            con.close()

    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if not rows:
        return pd.DataFrame(columns=["url", "title", "domain", "visited_at", "hour", "weekday", "day_of_week_name"])

    df = pd.DataFrame(rows, columns=["url", "title", "visit_time_webkit"])

    # Convert timestamps
    df["visited_at"] = df["visit_time_webkit"].apply(_webkit_to_datetime)
    df.drop(columns=["visit_time_webkit"], inplace=True)

    # Extract domain (netloc without www.)
    def _extract_domain(url: str) -> str:
        try:
            from urllib.parse import urlparse
            netloc = urlparse(url).netloc
            return netloc.removeprefix("www.")
        except Exception:
            return ""

    df["domain"] = df["url"].apply(_extract_domain)

    # Time-based convenience columns
    df["hour"] = df["visited_at"].apply(lambda dt: dt.hour if dt else None)
    df["weekday"] = df["visited_at"].apply(lambda dt: dt.isoweekday() if dt else None)
    df["day_of_week_name"] = df["visited_at"].apply(
        lambda dt: dt.strftime("%A") if dt else None
    )

    # Reorder columns
    df = df[["url", "title", "domain", "visited_at", "hour", "weekday", "day_of_week_name"]]

    return df


if __name__ == "__main__":
    df = read_chrome_history()
    print(f"Loaded {len(df):,} visits")
    print(df.head(10).to_string(index=False))
