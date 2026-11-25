# Theme Verification & Benchmark Suite

[verify_theme.py](verify_theme.py) builds the self-contained Hugo fixture site in `tests/fixture_site/`, checks all theme features in headless Chromium via Playwright (including offline `file://` mode), and enforces bundle-size and 4G load budgets.

## Usage

Run full verification + 4G benchmark on the fixture site:

```bash
~/gitland/python_venv/bin/python tests/verify_theme.py
```

Benchmark any real site using this theme:

```bash
~/gitland/python_venv/bin/python tests/verify_theme.py --site /path/to/site --base-path /site-subpath/
```

Benchmark an already-built `build_github` directory:

```bash
~/gitland/python_venv/bin/python tests/verify_theme.py --built-dir /path/to/build_github --base-path /notes/ --no-perf-assert
```
