from __future__ import annotations

import re

# ── Domain → category mapping ──────────────────────────────────────────────────
# Each key is a category name; values are lists of domain strings.
# Entries may be:
#   - exact domains:       "github.com"
#   - wildcard subdomains: "*.atlassian.net"  (any subdomain of atlassian.net)
#   - path-prefixed:       "linkedin.com/learning"  (matched against full URL)

DOMAIN_CATEGORIES: dict[str, list[str]] = {

    # ── DEV / PRACA ─────────────────────────────────────────────
    "work": [
        # Version control & code hosting
        "github.com", "gitlab.com", "bitbucket.org", "sourcehut.org",
        "gitea.io", "codeberg.org",
        # Issue tracking & project management
        "linear.app", "trello.com", "asana.com", "monday.com",
        "clickup.com", "basecamp.com", "height.app", "shortcut.com",
        "notion.so", "craft.do", "coda.io",
        # Jira / Confluence (wildcard — any subdomain)
        "*.atlassian.net", "jira.com", "confluence.com",
        # Docs & collaboration
        "docs.google.com", "sheets.google.com", "slides.google.com",
        "drive.google.com", "figma.com", "miro.com", "whimsical.com",
        "excalidraw.com", "lucid.app", "draw.io", "diagrams.net",
        # CI/CD & hosting
        "vercel.com", "netlify.com", "railway.app", "render.com",
        "heroku.com", "fly.io", "supabase.com", "planetscale.com",
        "neon.tech", "upstash.com",
        # Cloud consoles
        "console.aws.amazon.com", "cloud.google.com", "portal.azure.com",
        "app.digitalocean.com", "console.hetzner.cloud",
        # Package registries
        "npmjs.com", "pypi.org", "packagist.org", "crates.io",
        "rubygems.org", "pub.dev", "hex.pm",
        # API & Dev tools
        "postman.com", "insomnia.rest", "hoppscotch.io",
        "swagger.io", "stoplight.io", "readme.com",
        "sentry.io", "grafana.com", "datadog.com", "newrelic.com",
        "pingdom.com", "statuspage.io",
        # Code sandboxes
        "codepen.io", "jsfiddle.net", "codesandbox.io", "replit.com",
        "stackblitz.com", "glitch.com", "codeanywhere.com",
        # Dev reference
        "developer.mozilla.org", "devdocs.io", "tldr.sh",
        "regex101.com", "regexr.com", "crontab.guru",
        "jsonformatter.org", "jwt.io", "base64decode.org",
        "ray.so", "carbon.now.sh",
        # Communication (work context)
        "slack.com", "teams.microsoft.com", "zoom.us",
        "meet.google.com", "whereby.com", "loom.com",
        "gather.town", "discord.com",
        # Stack Overflow & Q&A
        "stackoverflow.com", "stackexchange.com", "*.stackexchange.com",
        "superuser.com", "serverfault.com",
    ],

    # ── NAUKA ───────────────────────────────────────────────────
    "learning": [
        # Courses
        "coursera.org", "udemy.com", "edx.org", "pluralsight.com",
        "skillshare.com", "brilliant.org",
        "khanacademy.org", "codecademy.com", "theodinproject.com",
        "freecodecamp.org", "frontendmasters.com", "egghead.io",
        "laracasts.com", "testdriven.io", "zerotomastery.io",
        "fireship.io", "scrimba.com",
        # Reference
        "wikipedia.org", "wikimedia.org", "wolframalpha.com",
        "arxiv.org", "scholar.google.com", "researchgate.net",
        "semanticscholar.org", "pubmed.ncbi.nlm.nih.gov",
        "overleaf.com",
        # Docs
        "docs.python.org", "docs.rs", "pkg.go.dev", "ruby-doc.org",
        "cppreference.com", "man7.org",
        # Reading & tech blogs
        "medium.com", "dev.to", "hashnode.com", "substack.com",
        "css-tricks.com", "smashingmagazine.com", "alistapart.com",
        "martinfowler.com", "joelonsoftware.com", "paulgraham.com",
        "hackernoon.com", "lobste.rs", "news.ycombinator.com",
        # Practice / competitive
        "leetcode.com", "hackerrank.com", "codewars.com",
        "exercism.org", "adventofcode.com", "projecteuler.net",
        "codeforces.com", "topcoder.com", "atcoder.jp",
        # Language learning
        "duolingo.com", "babbel.com", "busuu.com", "ankiweb.net",
        "quizlet.com", "memrise.com",
        # University / Polish edu portals
        "usos.uw.edu.pl", "usos.agh.edu.pl", "usosweb.pwr.edu.pl",
        "edukacja.pl", "student.pwr.edu.pl",
        "*.edu.pl", "*.ac.uk", "*.edu",
        "moodle.com", "*.moodle.com",
    ],

    # ── ROZRYWKA ────────────────────────────────────────────────
    "entertainment": [
        # Streaming video
        "netflix.com", "hbo.com", "max.com", "hbomax.com",
        "disneyplus.com", "primevideo.com",
        "crave.ca", "peacocktv.com", "paramountplus.com",
        "player.pl", "tvnplayer.pl", "polsatboxgo.pl",
        "vimeo.com",
        # Live streaming
        "twitch.tv", "kick.com",
        # Social / memes
        "9gag.com", "ifunny.co",
        "wykop.pl",
        # Social media (primary entertainment use)
        "instagram.com", "tiktok.com", "pinterest.com",
        "tumblr.com", "snapchat.com", "bereal.com",
        # Music streaming
        "open.spotify.com", "spotify.com", "music.youtube.com",
        "soundcloud.com", "tidal.com", "deezer.com", "bandcamp.com",
        "last.fm",
        # Film & TV reference
        "imdb.com", "rottentomatoes.com", "letterboxd.com",
        "filmweb.pl", "fdb.pl",
        # Comics & manga
        "webtoons.com", "tapas.io", "mangadex.org", "comixology.com",
        "marvel.com", "dc.com",
        # Podcasts
        "podcasts.apple.com", "podcastaddict.com", "anchor.fm",
    ],

    # ── GAMING ──────────────────────────────────────────────────
    "gaming": [
        "store.steampowered.com", "steamcommunity.com", "steampowered.com",
        "epicgames.com", "gog.com", "origin.com", "ea.com",
        "battle.net", "ubisoft.com", "rockstargames.com",
        "minecraft.net", "roblox.com",
        "chess.com", "lichess.org",
        "boardgamegeek.com", "tabletopia.com",
        "ign.com", "gamespot.com", "kotaku.com", "pcgamer.com",
        "cdaction.pl", "gry-online.pl",
        "speedrun.com", "howlongtobeat.com",
        "protondb.com", "lutris.net",
        "nexusmods.com", "curseforge.com",
    ],

    # ── SOCIAL ──────────────────────────────────────────────────
    "social": [
        "facebook.com", "messenger.com", "fb.com",
        "instagram.com", "threads.net",
        "twitter.com", "x.com",
        "linkedin.com",
        "whatsapp.com", "web.whatsapp.com",
        "web.telegram.org", "telegram.org",
        "discord.com", "discordapp.com",
        "snapchat.com", "signal.org",
        "tiktok.com", "reddit.com",
        "wykop.pl",
        "mastodon.social", "*.mastodon.social", "bsky.app",
        "joinlemmy.org", "*.lemmy.world",
    ],

    # ── AI TOOLS ────────────────────────────────────────────────
    "ai_tools": [
        "chat.openai.com", "openai.com", "chatgpt.com",
        "claude.ai", "anthropic.com",
        "gemini.google.com", "bard.google.com", "aistudio.google.com",
        "copilot.microsoft.com",
        "perplexity.ai", "you.com",
        "huggingface.co", "replicate.com",
        "midjourney.com", "leonardo.ai",
        "stability.ai", "runwayml.com", "runway.com",
        "elevenlabs.io", "suno.ai", "udio.com",
        "cursor.sh", "codeium.com", "tabnine.com",
        "poe.com", "character.ai", "janitorai.com",
        "v0.dev", "bolt.new", "lovable.dev",
        "together.ai", "groq.com", "anyscale.com",
    ],

    # ── WIADOMOŚCI ──────────────────────────────────────────────
    "news": [
        # International
        "bbc.com", "bbc.co.uk", "cnn.com", "reuters.com",
        "apnews.com", "theguardian.com", "nytimes.com",
        "washingtonpost.com", "economist.com", "ft.com",
        "bloomberg.com", "forbes.com", "techcrunch.com",
        "wired.com", "theverge.com", "arstechnica.com",
        "zdnet.com", "thenextweb.com", "engadget.com",
        "slashdot.org",
        # Polish
        "onet.pl", "wp.pl", "gazeta.pl", "wyborcza.pl",
        "tvn24.pl", "polsatnews.pl", "money.pl",
        "rp.pl", "dziennik.pl", "newsweek.pl",
        "benchmark.pl", "chip.pl",
    ],

    # ── EMAIL / PRODUKTYWNOŚĆ ───────────────────────────────────
    "productivity": [
        # Email
        "gmail.com", "mail.google.com",
        "outlook.com", "outlook.live.com", "hotmail.com",
        "protonmail.com", "mail.proton.me", "proton.me",
        "tutanota.com", "fastmail.com",
        "poczta.onet.pl", "poczta.wp.pl", "o2.pl",
        # Calendar & tasks
        "calendar.google.com", "calendly.com", "cal.com",
        "todoist.com", "ticktick.com", "any.do",
        "habitica.com", "beeminder.com",
        # Note taking
        "notion.so", "obsidian.md", "roamresearch.com",
        "logseq.com", "evernote.com",
        "simplenote.com", "standardnotes.com",
        # File storage
        "dropbox.com", "onedrive.live.com", "icloud.com",
        "box.com", "mega.nz",
        # Password managers
        "lastpass.com", "1password.com", "bitwarden.com",
        "dashlane.com",
    ],

    # ── ZAKUPY ──────────────────────────────────────────────────
    "shopping": [
        # Polish
        "allegro.pl", "olx.pl", "vinted.pl", "sprzedajemy.pl",
        "ceneo.pl", "nokaut.pl", "skapiec.pl",
        "mediaexpert.pl", "rtveuroagd.pl", "x-kom.pl",
        "morele.net", "oleole.pl", "al.to",
        "empik.com", "merlin.pl",
        "lidl.pl", "biedronka.pl", "auchan.pl",
        "frisco.pl", "barbora.pl", "eobuwie.pl",
        # Global
        "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr",
        "ebay.com", "ebay.pl", "aliexpress.com",
        "shein.com", "temu.com", "wish.com",
        "asos.com", "zalando.pl", "zalando.com", "aboutyou.pl",
        "zara.com", "hm.com", "reserved.com",
        "ikea.com",
        # Travel & transport
        "booking.com", "airbnb.com", "expedia.com",
        "skyscanner.com", "kayak.com", "momondo.com",
        "pkp.pl", "intercity.pl", "koleo.pl",
        "jakdojade.pl", "blablacar.pl",
        "wizzair.com", "ryanair.com", "lot.com",
    ],

    # ── FINANSE ─────────────────────────────────────────────────
    "finance": [
        # Polish banks
        "mbank.pl", "pko.pl", "pkobp.pl", "santander.pl",
        "ing.pl", "millennium.pl", "bnpparibas.pl",
        "aliorbank.pl", "credit-agricole.pl", "citibank.pl",
        # Neobanks & transfers
        "revolut.com", "wise.com", "n26.com",
        # Payments
        "paypal.com", "przelewy24.pl", "payu.pl", "stripe.com",
        # Crypto
        "binance.com", "coinbase.com", "kraken.com",
        "coingecko.com", "coinmarketcap.com",
        # Investing
        "tradingview.com", "stooq.pl", "investing.com",
        "bankier.pl",
        # Polish government / tax
        "zus.pl", "gov.pl", "e-pity.pl", "pfr.pl",
    ],

    # ── ZDROWIE ─────────────────────────────────────────────────
    "health": [
        "znany-lekarz.pl", "medicover.pl", "luxmed.pl",
        "cmp.pl", "carolina-med.pl",
        "webmd.com", "healthline.com", "mayoclinic.org",
        "nhs.uk", "mp.pl",
        "myfitnesspal.com", "cronometer.com",
        "strava.com", "garmin.com", "polar.com",
        "zwift.com", "trainerroad.com",
        "nike.com/run", "adidas.com",
    ],
}

# ── Subreddits considered "learning" ──────────────────────────────────────────
_LEARNING_SUBREDDITS: frozenset[str] = frozenset({
    "programming", "learnprogramming", "compsci", "cscareerquestions",
    "datascience", "machinelearning", "artificial", "deeplearning",
    "python", "javascript", "typescript", "rust", "golang", "cpp",
    "java", "haskell", "lisp", "prolog", "scala",
    "webdev", "frontend", "backend", "devops", "sysadmin",
    "networking", "netsec", "cybersecurity", "linux", "unix",
    "selfhosted", "homelab",
    "math", "statistics", "physics", "chemistry", "biology",
    "askscience", "science", "space", "astronomy",
    "history", "philosophy", "economics", "geopolitics",
    "languagelearning", "linguistics",
    "books", "scifi", "fantasy",  # borderline — included
    "productivity", "getdisciplined",
})

# YouTube titles → learning keywords (lowercased)
_LEARNING_TITLE_KEYWORDS: tuple[str, ...] = (
    "tutorial", "course", "lecture", "how to", "howto",
    "explained", "explanation", "programming", "coding",
    "study with me", "study session", "learn", "learning",
    "guide", "lesson", "walkthrough", "crash course",
    "introduction to", "intro to", "deep dive",
    "masterclass", "bootcamp", "workshop",
    "mathematics", "algebra", "calculus", "statistics",
    "physics", "chemistry", "biology", "history",
)

# Prefixes to strip before domain matching
_STRIP_PREFIXES: tuple[str, ...] = ("www.", "m.", "mobile.", "app.", "web.")

# Core domain → canonical name  (for TLD-variant matching)
_CORE_NAMES: dict[str, str] = {
    "amazon": "shopping",
    "ebay": "shopping",
    "booking": "shopping",
    "airbnb": "shopping",
    "linkedin": "social",  # default; URL path overrides
    "google": None,         # handled per-subdomain
    "microsoft": None,
}


def _strip_prefix(domain: str) -> str:
    """Remove common mobile/app prefixes from a domain string."""
    for prefix in _STRIP_PREFIXES:
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    return domain


def _build_lookup() -> tuple[
    dict[str, str],        # exact  domain → category
    list[tuple[str, str]], # (wildcard_suffix, category)  e.g. (".atlassian.net", "work")
]:
    """Pre-compile DOMAIN_CATEGORIES into fast lookup structures."""
    exact: dict[str, str] = {}
    wildcards: list[tuple[str, str]] = []

    for category, entries in DOMAIN_CATEGORIES.items():
        for entry in entries:
            if entry.startswith("*."):
                # "*.atlassian.net" → match any subdomain of atlassian.net
                suffix = entry[1:]  # ".atlassian.net"
                wildcards.append((suffix, category))
            else:
                # strip path component for exact lookup (path handled separately)
                base = entry.split("/")[0]
                exact[base] = category

    return exact, wildcards


_EXACT_MAP, _WILDCARD_SUFFIXES = _build_lookup()


def categorize_domain(domain: str, *, url: str = "", title: str = "") -> str:
    """
    Return the category string for a given domain.

    Parameters
    ----------
    domain : str
        The domain portion of the URL (may include www. etc.)
    url : str, optional
        Full URL — used for path-based overrides (YouTube, Reddit, LinkedIn).
    title : str, optional
        Page title — used for YouTube educational heuristic.

    Returns
    -------
    str
        One of the DOMAIN_CATEGORIES keys, or "other".
    """
    if not domain:
        return "other"

    clean = _strip_prefix(domain.lower())

    # ── Special-case: YouTube ──────────────────────────────────
    if clean in ("youtube.com", "youtu.be", "m.youtube.com"):
        if title:
            title_lower = title.lower()
            if any(kw in title_lower for kw in _LEARNING_TITLE_KEYWORDS):
                return "learning"
        # Check URL path for music
        if "music.youtube.com" in (url or ""):
            return "entertainment"
        return "entertainment"

    # ── Special-case: Reddit ───────────────────────────────────
    if clean in ("reddit.com", "old.reddit.com", "new.reddit.com"):
        m = re.search(r"/r/([^/?#]+)", url or "")
        if m:
            subreddit = m.group(1).lower()
            if subreddit in _LEARNING_SUBREDDITS:
                return "learning"
        return "entertainment"

    # ── Special-case: LinkedIn ─────────────────────────────────
    if clean in ("linkedin.com", "www.linkedin.com"):
        if "/learning/" in (url or ""):
            return "learning"
        return "social"

    # ── 1. Exact match (after stripping prefix) ────────────────
    if clean in _EXACT_MAP:
        return _EXACT_MAP[clean]

    # ── 2. Wildcard suffix match ───────────────────────────────
    for suffix, category in _WILDCARD_SUFFIXES:
        if clean == suffix[1:] or clean.endswith(suffix):
            return category

    # ── 3. Path-prefix match for URL-scoped entries ───────────
    # e.g. "scholar.google.com" → try matching full domain against exact map
    # (already handled above); now try with subdomains stripped
    parts = clean.split(".")
    if len(parts) > 2:
        # Try parent domain  e.g. "blog.github.com" → "github.com"
        parent = ".".join(parts[-2:])
        if parent in _EXACT_MAP:
            return _EXACT_MAP[parent]
        # Wildcard for parent
        for suffix, category in _WILDCARD_SUFFIXES:
            if parent == suffix[1:] or parent.endswith(suffix):
                return category

    # ── 4. TLD-variant matching ────────────────────────────────
    # Extract the "core" name: amazon.co.uk → "amazon"
    # Strategy: take the part before the first dot
    core = parts[0] if parts else ""
    if core in _CORE_NAMES:
        override = _CORE_NAMES[core]
        if override is not None:
            return override
        # None means "needs further analysis" — fall through to "other"

    # ── 5. Partial / contains match for well-known names ──────
    # Covers amazon.de, amazon.fr, etc.
    for known_core, cat in (
        ("amazon", "shopping"),
        ("ebay", "shopping"),
        ("aliexpress", "shopping"),
        ("allegro", "shopping"),
        ("booking", "shopping"),
        ("airbnb", "shopping"),
        ("netflix", "entertainment"),
        ("spotify", "entertainment"),
        ("google", None),      # too broad — skip
        ("microsoft", None),
        ("apple", None),
    ):
        if known_core in clean:
            if cat is not None:
                return cat

    # ── 6. Fallback ───────────────────────────────────────────
    return "other"
