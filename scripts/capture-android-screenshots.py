#!/usr/bin/env python3
"""Capture Play Store screenshots on Android emulator via adb + uiautomator."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ADB = Path.home() / "Library/Android/sdk/platform-tools/adb"
SERIAL = "emulator-5554"
OUT = Path(__file__).resolve().parent.parent / "store-assets/android/phone/es-MX"
API = "https://app.vitt.io/api/v1"
EMAIL = "dev@vitt.io"
PASSWORD = "Screenshot1!"


def adb(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(ADB), "-s", SERIAL, *args],
        check=check,
        capture_output=True,
        text=True,
    )


def dump_ui() -> str:
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    adb("pull", "/sdcard/ui.xml", "/tmp/ui.xml")
    return Path("/tmp/ui.xml").read_text()


def ui_nodes() -> list[ET.Element]:
    xml = dump_ui()
    return list(ET.fromstring(xml).iter("node"))


def ui_text() -> str:
    return dump_ui()


def bounds_center(bounds: str) -> tuple[int, int] | None:
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
    if not m:
        return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2


def find_center(pat: str, prefer_clickable: bool = False) -> tuple[int, int] | None:
    rx = re.compile(pat, re.I)
    matches: list[tuple[int, int, bool]] = []
    for node in ui_nodes():
        for attr in ("content-desc", "text"):
            val = node.attrib.get(attr, "")
            if rx.search(val):
                pt = bounds_center(node.attrib.get("bounds", ""))
                if pt:
                    clickable = node.attrib.get("clickable", "false") == "true"
                    matches.append((pt[0], pt[1], clickable))
    if not matches:
        return None
    if prefer_clickable:
        clickables = [m for m in matches if m[2]]
        if clickables:
            # Prefer rightmost mini-FAB (higher x)
            return max(clickables, key=lambda m: m[0])[:2]
    return matches[0][:2]


def tap(pat: str, prefer_clickable: bool = False) -> None:
    pt = find_center(pat, prefer_clickable=prefer_clickable)
    if not pt:
        raise RuntimeError(f"UI element not found: {pat}")
    adb("shell", "input", "tap", str(pt[0]), str(pt[1]))


def long_press(pat: str, ms: int = 1200) -> None:
    pt = find_center(pat)
    if not pt:
        raise RuntimeError(f"UI element not found for long press: {pat}")
    x, y = pt
    adb("shell", "input", "swipe", str(x), str(y), str(x), str(y), str(ms))


def open_fab_menu() -> None:
    for attempt in range(3):
        if wait_text("Nueva transacción", 2) and wait_text("Vittbot", 1):
            return
        long_press("Agregar transacción")
        time.sleep(1.5)
        if wait_text("Nueva transacción", 4) and wait_text("Vittbot", 2):
            return
        adb("shell", "input", "keyevent", "4")
        time.sleep(0.5)
    raise RuntimeError("FAB speed dial did not open")


def wait_text(pat: str, seconds: int = 60) -> bool:
    rx = re.compile(pat, re.I)
    for _ in range(seconds):
        if rx.search(ui_text()):
            return True
        time.sleep(1)
    return False


def focused_package() -> str:
    out = adb("shell", "dumpsys", "window").stdout
    for line in out.splitlines():
        if "mCurrentFocus" in line:
            m = re.search(r"(\S+)/\S+", line)
            if m:
                return m.group(1)
    return ""


def ensure_vittio() -> None:
    pkg = focused_package()
    if pkg == "io.vitt.app":
        return
    for _ in range(5):
        adb("shell", "input", "keyevent", "4")
        time.sleep(0.5)
        if focused_package() == "io.vitt.app":
            return
    adb("shell", "monkey", "-p", "io.vitt.app", "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(5)


def cap(name: str, must_match: str, delay: float = 2.0) -> None:
    time.sleep(delay)
    ensure_vittio()
    if focused_package() != "io.vitt.app":
        raise RuntimeError(f"Wrong app in foreground before {name}: {focused_package()}")
    if not re.search(must_match, ui_text(), re.I):
        raise RuntimeError(f"Screen verification failed for {name}; expected /{must_match}/")
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "wb") as f:
        subprocess.run(
            [str(ADB), "-s", SERIAL, "exec-out", "screencap", "-p"],
            stdout=f,
            check=True,
        )
    print(f"saved {OUT / name}")


def mark_analytics_seen() -> None:
    try:
        req = urllib.request.Request(
            f"{API}/login",
            data=json.dumps({"user": {"email": EMAIL, "password": PASSWORD}}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
        token = body["data"]["access_token"]
        patch = urllib.request.Request(
            f"{API}/user_settings",
            data=json.dumps({"user_setting": {"analytics_notice_seen_at": True}}).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
            method="PATCH",
        )
        with urllib.request.urlopen(patch, timeout=30):
            pass
        print("analytics notice marked seen on prod")
    except Exception as exc:
        print(f"skip analytics API ({exc}); will dismiss in UI if shown")


def fill_field(pattern: str, value: str) -> None:
    tap(pattern)
    time.sleep(0.4)
    adb("shell", "input", "keyevent", "KEYCODE_MOVE_END")
    for _ in range(40):
        adb("shell", "input", "keyevent", "67")
    adb("shell", "input", "text", value)
    time.sleep(0.3)


def dismiss_analytics_modal() -> None:
    for label in (r"Entendido", r"Aceptar", r"Continuar", r"OK"):
        if wait_text(label, 2):
            tap(label)
            time.sleep(1)
            return


def connect_dev_client() -> None:
    adb("reverse", "tcp:8081", "tcp:8081")
    adb("shell", "monkey", "-p", "io.vitt.app", "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(8)
    if wait_text(r"10\.0\.2\.2:8081", 8):
        tap(r"10\.0\.2\.2:8081")
        print("connecting to Metro…")
        time.sleep(35)
    if wait_text("Continue", 6):
        tap("Continue")
        time.sleep(2)


def login() -> None:
    if wait_text("Saldo total", 5):
        print("already logged in")
        return

    if not wait_text("Bienvenido de vuelta", 15):
        connect_dev_client()
        if not wait_text("Bienvenido de vuelta", 20):
            raise RuntimeError("Login screen did not appear")

    fill_field(r"correo@ejemplo\.com|Atrás", EMAIL)
    fill_field("Password", PASSWORD)
    adb("shell", "input", "keyevent", "4")
    time.sleep(0.5)

    if not wait_text(r"Iniciar sesión", 5):
        raise RuntimeError("Login button missing")
    tap("Iniciar sesión")
    time.sleep(15)

    if wait_text("Allow|Notificaciones", 4):
        pt = find_center(r"Don.t allow|Don't allow|No permitir|Denegar")
        if pt:
            adb("shell", "input", "tap", str(pt[0]), str(pt[1]))
            time.sleep(2)

    dismiss_analytics_modal()

    if not wait_text("Saldo total", 90):
        raise RuntimeError("Dashboard did not load after login")


def capture_assistant_shot() -> None:
    open_fab_menu()
    tap("Vittbot", prefer_clickable=True)
    time.sleep(4)
    if not wait_text(r"Pregunta lo que quieras|Vittbot", 20):
        raise RuntimeError("Assistant screen did not open")
    if wait_text("Historial", 3):
        tap("Historial")
        time.sleep(2)
    if wait_text(r"Análisis de gastos", 8):
        tap(r"Análisis de gastos")
        time.sleep(3)
    if not wait_text(r"¿En qué puedo ahorrar|Potencial de ahorro|comida este mes", 20):
        raise RuntimeError("Seeded assistant conversation did not load")
    cap("05-assistant.png", r"¿En qué puedo ahorrar|Potencial de ahorro")


def capture_remaining() -> int:
    """Capture 04-statement*, 05-assistant when already logged in."""
    ensure_vittio()
    if not wait_text("Saldo total|Transacciones", 10):
        raise RuntimeError("App not on a logged-in screen")
    tap("Pestaña Actividad")
    wait_text(r"Transacciones|Amazon", 20)
    open_fab_menu()
    cap(
        "04-statement-fab.png",
        r"Nueva transacción.*Subir estado de cuenta.*Vittbot|Vittbot.*Subir estado de cuenta",
    )
    tap("Subir estado de cuenta", prefer_clickable=True)
    time.sleep(3)
    if not wait_text(r"Seleccionar archivo PDF|FECHA DE CORTE", 20):
        raise RuntimeError("Statement upload modal did not open")
    cap("04-statement.png", r"Seleccionar archivo PDF|FECHA DE CORTE")
    adb("shell", "input", "keyevent", "4")
    time.sleep(1.5)
    tap("Pestaña Actividad")
    time.sleep(1)
    capture_assistant_shot()
    print("Done — remaining screenshots captured")
    return 0


def main() -> int:
    mark_analytics_seen()
    login()

    cap("01-dashboard.png", r"Saldo total")

    tap("Pestaña Actividad")
    if not wait_text(r"Walmart|Nómina|Amazon|Actividad reciente", 25):
        raise RuntimeError("Transactions tab did not load")
    cap("02-transactions.png", r"Walmart|Nómina|Amazon|Actividad")

    tap("Pestaña Inicio")
    wait_text("Saldo total", 15)

    # Short tap FAB → new transaction (voice entry screen)
    tap("Agregar transacción")
    time.sleep(3)
    if not wait_text(r"Toca para hablar|Nueva transacción", 15):
        raise RuntimeError("New transaction screen did not open")
    cap("03-voice.png", r"Toca para hablar")
    adb("shell", "input", "keyevent", "4")
    time.sleep(1.5)

    tap("Pestaña Actividad")
    wait_text(r"Transacciones|Amazon|Walmart", 20)

    open_fab_menu()
    cap(
        "04-statement-fab.png",
        r"Nueva transacción.*Subir estado de cuenta.*Vittbot|Vittbot.*Subir estado de cuenta",
    )
    tap("Subir estado de cuenta", prefer_clickable=True)
    time.sleep(3)
    if not wait_text(r"Seleccionar archivo PDF|FECHA DE CORTE", 20):
        raise RuntimeError("Statement upload modal did not open")
    cap("04-statement.png", r"Seleccionar archivo PDF|FECHA DE CORTE")
    adb("shell", "input", "keyevent", "4")
    time.sleep(1.5)

    tap("Pestaña Actividad")
    time.sleep(1)
    capture_assistant_shot()

    print("Done — all screenshots captured")
    return 0


if __name__ == "__main__":
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else "full"
        if mode == "remaining":
            sys.exit(capture_remaining())
        if mode == "assistant":
            capture_assistant_shot()
            print("Done — assistant screenshot captured")
            sys.exit(0)
        sys.exit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
