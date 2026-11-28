#!/usr/bin/env python3
"""Browser verification and 4G performance regression suite for sanskrit-documentation-theme-hugo.

Default mode builds the self-contained `tests/fixture_site` with Hugo, verifies all
theme features (lazy sidebar, lazy search datalist, Cache API index reuse,
Bootstrap-lite toggles/dropdowns, lazy transliteration/spreadsheets/md-includes,
inline comments, MathJax gating, TOC/collapsible sections, inline scripts, random
redirect, and offline `file://` mode), and checks bundle-size and 4G load budgets.

Optional modes:
  --site /path/to/hugo-site     Build and benchmark an external Hugo site.
  --built-dir /path/to/public   Serve and benchmark an already-built directory.
"""

import argparse
import functools
import gzip
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

THEME_ROOT = Path(__file__).resolve().parent.parent
FIXTURE_SITE = Path(__file__).resolve().parent / "fixture_site"
COMPRESSIBLE_EXTS = (
    ".html", ".js", ".css", ".json", ".svg", ".xml", ".csv", ".toml", ".tsv", ".md"
)


class GzipMountHandler(http.server.SimpleHTTPRequestHandler):
    """Serves a directory mounted at a URL base path with gzip compression."""

    def __init__(self, *args, mount_path="/", root_dir=".", **kwargs):
        self.mount_path = "/" + mount_path.strip("/")
        if self.mount_path != "/":
            self.mount_path += "/"
        self.root_dir = os.path.abspath(root_dir)
        super().__init__(*args, **kwargs)

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if self.mount_path != "/":
            if clean == self.mount_path.rstrip("/"):
                rel = ""
            elif clean.startswith(self.mount_path):
                rel = clean[len(self.mount_path):]
            else:
                return os.path.join("/nonexistent", clean.lstrip("/"))
        else:
            rel = clean.lstrip("/")
        return os.path.join(self.root_dir, rel.lstrip("/"))

    def do_GET(self):
        target = self.translate_path(self.path)
        if os.path.isdir(target):
            target = os.path.join(target, "index.html")
        if not os.path.isfile(target):
            self.send_error(404)
            return

        ctype = self.guess_type(target)
        with open(target, "rb") as f:
            data = f.read()

        ae = self.headers.get("Accept-Encoding", "")
        if "gzip" in ae and target.endswith(COMPRESSIBLE_EXTS) and len(data) > 512:
            payload = gzip.compress(data, compresslevel=6)
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Encoding", "gzip")
        else:
            payload = data
            self.send_response(200)
            self.send_header("Content-Type", ctype)

        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "public, max-age=600")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass


def start_server(root_dir, mount_path="/"):
    handler = functools.partial(GzipMountHandler, mount_path=mount_path, root_dir=root_dir)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, httpd.server_address[1]


def build_hugo_site(site_dir, base_url, dest_dir):
    with tempfile.TemporaryDirectory() as themes_dir:
        os.symlink(str(THEME_ROOT), os.path.join(themes_dir, THEME_ROOT.name))
        subprocess.run(
            [
                "hugo",
                "--source", str(site_dir),
                "--themesDir", themes_dir,
                "--baseURL", base_url,
                "--destination", str(dest_dir),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )


def attach_route_and_error_collectors(page, allowed_hosts):
    errors = []
    page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console.{msg.type}: {msg.text}")
        if msg.type == "error"
        else None,
    )

    def handle_route(route):
        url = route.request.url
        if any(url.startswith(h) for h in allowed_hosts):
            route.continue_()
        else:
            route.fulfill(status=204, body="")

    page.route("**/*", handle_route)
    return errors


def measure_page(browser, url, label, allowed_hosts, throttle_4g=True):
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = attach_route_and_error_collectors(page, allowed_hosts)

    if throttle_4g:
        cdp = ctx.new_cdp_session(page)
        cdp.send("Network.enable")
        cdp.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": 40,
                "downloadThroughput": 1250 * 1024,
                "uploadThroughput": 625 * 1024,
            },
        )

    page.add_init_script(
        """
        window.__perfMarks = { longTasks: [], sdThemeDoneAt: null };
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                window.__perfMarks.longTasks.push(Math.round(entry.duration));
            }
        }).observe({ type: 'longtask', buffered: true });
        document.addEventListener('sdThemeDone', () => {
            window.__perfMarks.sdThemeDoneAt = Math.round(performance.now());
        });
        """
    )

    t0 = time.perf_counter()
    page.goto(url, wait_until="load")
    page.wait_for_function("() => window.__perfMarks.sdThemeDoneAt !== null", timeout=60000)
    page.wait_for_function("() => document.querySelectorAll('#sidebarBody li').length > 0", timeout=60000)
    ready_ms = round((time.perf_counter() - t0) * 1000)

    metrics = page.evaluate(
        """() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const paints = {};
            for (const p of performance.getEntriesByType('paint')) {
                paints[p.name] = Math.round(p.startTime);
            }
            const res = performance.getEntriesByType('resource');
            return {
                fcpMs: paints['first-contentful-paint'] || 0,
                domInteractiveMs: Math.round(nav.domInteractive),
                dclMs: Math.round(nav.domContentLoadedEventEnd),
                loadMs: Math.round(nav.loadEventEnd),
                sdThemeDoneMs: window.__perfMarks.sdThemeDoneAt,
                longTasksMs: window.__perfMarks.longTasks.reduce((a, b) => a + b, 0),
                maxLongTaskMs: window.__perfMarks.longTasks.length ? Math.max(...window.__perfMarks.longTasks) : 0,
                domNodes: document.getElementsByTagName('*').length,
                sidebarNodes: document.querySelectorAll('#sidebarBody li, #sidebarBody details').length,
                datalistOptions: document.querySelectorAll('#pageDataList option').length,
                wireKb: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
                rawKb: Math.round(res.reduce((s, r) => s + (r.decodedBodySize || 0), 0) / 1024),
                requests: res.length,
            };
        }"""
    )
    metrics["readyMs"] = ready_ms
    metrics["errors"] = errors
    print(
        f"[PERF] {label:32s} | FCP={metrics['fcpMs']}ms | sdThemeDone={metrics['sdThemeDoneMs']}ms "
        f"| ready={ready_ms}ms | maxLongTask={metrics['maxLongTaskMs']}ms "
        f"| dom={metrics['domNodes']} | wire={metrics['wireKb']}KB ({metrics['requests']} reqs)"
    )
    ctx.close()
    return metrics


def run_fixture_functional_tests(playwright, base_url):
    print("\n=== FUNCTIONAL VERIFICATION (fixture_site) ===")
    browser = playwright.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    allowed = [base_url]
    errors = attach_route_and_error_collectors(page, allowed)

    # 1. Home page: deferred uiLib-bundle, no MathJax on non-math page, lazy sidebar & search
    page.goto(base_url, wait_until="networkidle")
    page.wait_for_function("() => document.querySelectorAll('#sidebarBody details[data-recdir]').length > 0")
    ui_script_defer = page.evaluate(
        "() => [...document.scripts].find(s => s.src.includes('uiLib-bundle.js'))?.defer"
    )
    assert ui_script_defer is True, "uiLib-bundle.js should be deferred on pages without inline <script>"
    assert page.evaluate("() => !document.getElementById('MathJax-script')"), "MathJax should not load on non-math page"

    lazy_details = page.locator("#sidebarBody details[data-recdir]").first
    recdir_val = lazy_details.get_attribute("data-recdir")
    assert lazy_details.locator("ul > *").count() == 0
    lazy_details.locator("summary").click()
    page.wait_for_timeout(100)
    assert page.evaluate(
        "(r) => [...document.querySelectorAll('#sidebarBody details')].some(d => d.open && !d.hasAttribute('data-recdir') && d.querySelectorAll(':scope > ul > *').length > 0)",
        recdir_val,
    )
    print(f"[PASS] Deferred bundle, MathJax skipped on non-math page, lazy sidebar expand ({recdir_val})")

    assert page.locator("#pageDataList option").count() == 0
    page.locator("#searchInput").focus()
    page.wait_for_function("() => document.querySelectorAll('#pageDataList option').length >= 5")
    print(f"[PASS] Lazy search datalist populated on focus ({page.locator('#pageDataList option').count()} options)")

    # 2. Bootstrap-lite collapse, dropdowns, text size
    page.locator('button[href="#transliterationDropdown"]').click()
    assert page.locator("#transliterationDropdown").evaluate("el => el.classList.contains('show')")
    page.locator("#audioDropdownMenuButton").click()
    assert page.locator("#audioDiv .dropdown-menu").evaluate("el => el.classList.contains('show')")
    page.keyboard.press("Escape")
    assert not page.locator("#audioDiv .dropdown-menu").evaluate("el => el.classList.contains('show')")

    before_fs = page.evaluate("() => getComputedStyle(document.querySelector('main')).fontSize")
    page.locator('button:has-text("A±")').click()
    page.locator('a:has-text("A+")').click()
    after_fs = page.evaluate("() => getComputedStyle(document.querySelector('main')).fontSize")
    assert before_fs != after_fs
    print(f"[PASS] Bootstrap-lite collapse/dropdowns & changeTextSize ({before_fs} -> {after_fs})")

    # 3. Warm Cache API check + inline comments + TOC + collapsible sections + lazy transliteration
    page.goto(f"{base_url}section_a/article_one/", wait_until="networkidle")
    page.wait_for_selector("#toc_ul li", state="attached")
    page.locator("#toc_header > summary").click()
    assert page.locator("#toc_ul li").first.is_visible()
    assert page.evaluate("() => performance.getEntriesByType('resource').filter(r => r.name.includes('index.json')).length") == 0
    assert page.locator("#sidebarBody li.active").count() == 1
    assert page.locator("details.headingDetail").count() > 0
    assert page.locator(".inline_comment").count() == 1
    assert "+++literal-code-marker+++" in page.locator("pre").inner_text()
    print("[PASS] Warm Cache API index.json, active sidebar, TOC, collapsible sections, inline comments")

    page.goto(f"{base_url}section_a/article_one/?comment_style=hidden", wait_until="networkidle")
    assert page.locator(".inline_comment[hidden]").count() == 1
    page.goto(f"{base_url}section_a/article_one/?transliterationTarget=iast", wait_until="networkidle")
    page.wait_for_function("() => document.body.textContent.includes('saṃskṛtam')")
    print("[PASS] Hidden inline comments & lazy transliteration (devanagari -> iast)")

    # 4. HTML + Markdown js_include lazy chunks
    page.goto(f"{base_url}section_a/article_two/", wait_until="networkidle")
    page.wait_for_function(
        "() => document.querySelectorAll('.js_include').length === 2 && document.querySelectorAll('.js_include[unfilled]').length === 0"
    )
    post_text = page.locator("#post_content").inner_text()
    assert "संस्कृतम्" in post_text and "Sample Included Markdown" in post_text
    print("[PASS] HTML and Markdown (.md) js_include chunks rendered")

    # 4b. detailsPattern, detailContentPattern, fieldNames, metadataDetailName="false", and 2nd-order include ordering
    page.goto(f"{base_url}section_a/details_include_page/", wait_until="networkidle")
    page.wait_for_function(
        "() => document.querySelectorAll('.js_include').length === 15 && document.querySelectorAll('.js_include[unfilled]').length === 0"
    )
    def_txt = page.locator("#inc_default").text_content()
    assert "Bare intro paragraph outside details." in def_txt
    assert "author : Test Author" in def_txt
    assert "Detail Alpha" in def_txt and "Detail Beta" in def_txt
    assert page.locator("#inc_default details summary:has-text('Metadata')").count() == 0
    assert page.locator("#inc_default details summary:has-text('false')").count() == 0

    beta_txt = page.locator("#inc_beta").text_content()
    assert "Bare intro paragraph" not in beta_txt and "Detail Alpha" not in beta_txt
    assert page.locator("#inc_beta > details").count() == 1
    assert "Detail Beta" in beta_txt and "Nested Child" in beta_txt

    nested_txt = page.locator("#inc_nested").text_content()
    assert "Detail Beta" not in nested_txt
    assert page.locator("#inc_nested > details").count() == 1
    assert "Nested Child" in nested_txt and "Inner leaf text." in nested_txt

    meta_txt = page.locator("#inc_meta").text_content()
    assert "Detail Alpha" not in meta_txt and "Custom Meta" in meta_txt and "Test Author" in meta_txt
    html_beta_txt = page.locator("#inc_html_beta").text_content()
    assert "Bare HTML intro" not in html_beta_txt and "Alpha HTML" not in html_beta_txt and "HTML beta body." in html_beta_txt

    content_only_txt = page.locator("#inc_content_only").text_content()
    assert "Detail Alpha" in content_only_txt and "Alpha body content." in content_only_txt
    assert "Detail Beta" not in content_only_txt and "Bare intro paragraph" not in content_only_txt

    both_txt = page.locator("#inc_both").text_content()
    assert "Detail Beta" in both_txt and "Inner leaf text." in both_txt
    assert page.locator("#inc_both > details").count() == 1

    assert page.locator("#inc_both_miss details").count() == 0
    assert "Detail Beta" not in page.locator("#inc_both_miss").text_content()

    anchored_txt = page.locator("#inc_anchored_child").text_content()
    assert "Detail Beta" not in anchored_txt
    assert page.locator("#inc_anchored_child > details").count() == 1
    assert "Nested Child" in anchored_txt and "Inner leaf text." in anchored_txt

    nested_order_txt = page.locator("#inc_nested_filter_order").text_content()
    assert "Alpha" not in nested_order_txt and "hidden inside second-order alpha" not in nested_order_txt
    assert "Beta bold body with TARGET_MARKER" in nested_order_txt
    assert "Second Order Child" in nested_order_txt and "Second order content without target." in nested_order_txt
    fetched_urls = page.evaluate("() => performance.getEntriesByType('resource').map(r => r.name)")
    assert any("details_nested_inc_beta.md" in u for u in fetched_urls)
    assert not any("details_nested_inc_alpha.md" in u for u in fetched_urls), (
        "2nd-order include inside filtered-out <details> should not be fetched"
    )

    path_match_txt = page.locator("#inc_path_match").text_content()
    assert page.locator("#inc_path_match > details").count() == 1
    assert "गङ्गानथ-मूलानुवादः" in path_match_txt
    assert "Defiling a maiden, selling a tank." in path_match_txt
    assert "सर्वाष् टीकाः" not in path_match_txt
    assert "मेधातिथिः" not in path_match_txt
    assert "Other block that must NOT match!" not in path_match_txt

    assert page.locator("#inc_quote_0 blockquote").count() == 0
    assert page.locator("#inc_quote_2 > blockquote > blockquote").count() == 1
    assert "Alpha body content." in page.locator("#inc_quote_2 > blockquote > blockquote").text_content()
    assert page.locator("#inc_quote_collapsed > blockquote > details").count() == 1
    assert "Quoted Collapsed" in page.locator("#inc_quote_collapsed > blockquote > details").text_content()
    print("[PASS] js_include detailsPattern, detailContentPattern, quote, fieldNames, metadataDetailName, and pre-2nd-order filtering")

    # 5. MathJax page (including custom \set, \union, \seq macros)
    page.goto(f"{base_url}section_a/math_page/", wait_until="networkidle")
    page.wait_for_selector("mjx-container", timeout=15000)
    assert "Undefined control sequence" not in page.locator("#post_content").inner_text()
    print("[PASS] MathJax rendered on math page with custom TeX macros")

    # 6. Lazy Handsontable spreadsheet page
    page.goto(f"{base_url}section_a/sheet_page/", wait_until="networkidle")
    page.wait_for_selector(".handsontable", timeout=15000)
    assert "alpha" in page.locator(".handsontable").first.inner_text()
    print("[PASS] Lazy Handsontable spreadsheet rendered")

    # 7. Inline script sync mode & replaceWithQueryParam
    page.goto(f"{base_url}section_a/inline_script/?userParam=TestUser&repoParam=TestRepo", wait_until="networkidle")
    assert page.evaluate("() => [...document.scripts].find(s => s.src.includes('uiLib-bundle.js'))?.defer") is False
    assert page.input_value("#input_userParam") == "TestUser"
    assert "TestRepo" in page.locator("#post_content").inner_text()
    print("[PASS] Inline script sync uiLib-bundle & replaceWithQueryParam")

    # 8. Random redirect (module_dir_tree + module_uiLib)
    page.goto(f"{base_url}section_a/random_redirect/", wait_until="networkidle")
    page.wait_for_url("**/section_b/b_one/**", timeout=10000)
    print(f"[PASS] Random redirect (module_dir_tree + module_uiLib) -> {page.url}")

    assert not errors, f"Browser errors observed: {errors}"
    print("[PASS] Zero console/page errors across all fixture checks")
    ctx.close()
    browser.close()


def run_file_protocol_test(playwright):
    print("\n=== OFFLINE file:// VERIFICATION ===")
    with tempfile.TemporaryDirectory() as tmpdir:
        dest = Path(tmpdir) / "site_file"
        build_hugo_site(FIXTURE_SITE, f"file://{dest}/", dest)
        browser = playwright.chromium.launch(headless=True, args=["--allow-file-access-from-files"])
        ctx = browser.new_context()
        page = ctx.new_page()
        errors = attach_route_and_error_collectors(page, ["file://"])

        page.goto(f"file://{dest}/index.html", wait_until="load")
        page.wait_for_function("() => document.querySelectorAll('#sidebarBody li').length > 0", timeout=15000)
        page.goto(f"file://{dest}/section_a/sheet_page/index.html", wait_until="load")
        page.wait_for_selector(".handsontable", timeout=15000)

        assert not errors, f"file:// errors observed: {errors}"
        print("[PASS] file:// offline mode: index.json XHR, sidebar, and lazy spreadsheet chunk work")
        ctx.close()
        browser.close()


def main():
    parser = argparse.ArgumentParser(description="Verify and benchmark sanskrit-documentation-theme-hugo.")
    parser.add_argument("--site", type=Path, help="External Hugo site directory to build and benchmark.")
    parser.add_argument("--built-dir", type=Path, help="Already-built site output directory to serve and benchmark.")
    parser.add_argument("--base-path", default="/", help="URL mount base path when using --built-dir or --site (e.g. /notes/).")
    parser.add_argument("--skip-file", action="store_true", help="Skip offline file:// check.")
    parser.add_argument("--no-perf-assert", action="store_true", help="Print performance metrics without failing thresholds.")
    parser.add_argument("--max-bundle-kb", type=int, default=100, help="Max initial uiLib-bundle.js size in KB.")
    parser.add_argument("--max-fcp-ms", type=int, default=1500, help="Max 4G FCP threshold in ms.")
    parser.add_argument("--max-sd-done-ms", type=int, default=1500, help="Max 4G sdThemeDone threshold in ms.")
    parser.add_argument("--max-long-task-ms", type=int, default=200, help="Max single main-thread long task in ms.")
    parser.add_argument("--json-out", type=Path, help="Optional JSON path to write benchmark metrics.")
    args = parser.parse_args()

    bundle_path = THEME_ROOT / "static" / "webpack_dist" / "uiLib-bundle.js"
    bundle_kb = round(bundle_path.stat().st_size / 1024, 1)
    print(f"[INFO] Initial entry bundle size: {bundle_kb} KB ({bundle_path.name})")
    if not args.no_perf_assert:
        assert bundle_kb <= args.max_bundle_kb, f"uiLib-bundle.js grew to {bundle_kb} KB (budget {args.max_bundle_kb} KB)"

    mount_path = "/" + args.base_path.strip("/")
    if mount_path != "/":
        mount_path += "/"

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        if args.built_dir:
            serve_root = args.built_dir
            httpd, port = start_server(serve_root, mount_path=mount_path)
            base_url = f"http://127.0.0.1:{port}{mount_path}"
        else:
            site_src = args.site or FIXTURE_SITE
            serve_root = tmp_path / "built_site"
            serve_root.mkdir(parents=True, exist_ok=True)
            httpd, port = start_server(serve_root, mount_path=mount_path)
            base_url = f"http://127.0.0.1:{port}{mount_path}"
            t_build = time.perf_counter()
            build_hugo_site(site_src, base_url, serve_root)
            print(f"[INFO] Hugo built {site_src.name} in {round((time.perf_counter() - t_build) * 1000)} ms")

        try:
            with sync_playwright() as p:
                if not args.site and not args.built_dir:
                    run_fixture_functional_tests(p, base_url)
                    if not args.skip_file:
                        run_file_protocol_test(p)

                print("\n=== PERFORMANCE BENCHMARK (Gzipped HTTP, 4G 10Mbps / 40ms RTT) ===")
                browser = p.chromium.launch(headless=True)
                perf_4g = measure_page(browser, base_url, "home (4G)", [base_url], throttle_4g=True)
                perf_local = measure_page(browser, base_url, "home (local)", [base_url], throttle_4g=False)
                browser.close()

                if args.json_out:
                    args.json_out.write_text(json.dumps({"bundleKb": bundle_kb, "4g": perf_4g, "local": perf_local}, indent=2))

                if not args.no_perf_assert:
                    assert perf_4g["fcpMs"] <= args.max_fcp_ms, f"FCP {perf_4g['fcpMs']}ms > {args.max_fcp_ms}ms"
                    assert perf_4g["sdThemeDoneMs"] <= args.max_sd_done_ms, f"sdThemeDone {perf_4g['sdThemeDoneMs']}ms > {args.max_sd_done_ms}ms"
                    assert perf_4g["maxLongTaskMs"] <= args.max_long_task_ms, f"maxLongTask {perf_4g['maxLongTaskMs']}ms > {args.max_long_task_ms}ms"
                    assert not perf_4g["errors"] and not perf_local["errors"], "Errors during perf run"
                    print("[PASS] All performance budgets satisfied!")
        finally:
            httpd.shutdown()


if __name__ == "__main__":
    main()
