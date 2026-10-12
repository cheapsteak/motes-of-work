"""Re-time keyframes.json for task 16: the simultaneous build (vibe-build 8 -> 6.4 screens) and
the reveal without rv-6 (4 -> 3.2 screens). Rewrites only the `at` strings, keeping the layout."""
import math
import re
import sys

PATH = "src/timeline/keyframes.json"

VB_OLD_L, VB_NEW_L = 8, 6.4
RV_OLD_L, RV_NEW_L = 4, 3.2

# vibe-build: old local -> new screens (non-lap keys).
VB = {
    0: 0,
    0.1: 0.30,
    0.175: 0.80,
    0.28125: 1.10,
    0.34375: 1.60,
    0.37: 1.60,
    0.41: 1.90,
    0.4125: 1.90,
    0.46875: 2.35,
    0.5125: 2.70,
    0.53: 2.70,
    0.565: 3.00,
    0.56875: 3.00,
    0.6125: 3.35,
    0.625: 3.45,
    0.64375: 3.60,
    0.68125: 3.90,
    0.7: 4.05,
    0.745: 4.40,
    0.75625: 4.40,
    0.85: 5.15,
    0.85625: 5.20,
    0.875: 5.40,
    1: 6.40,
}
# The steer cancel: nine keys from 0.43125 in steps of 0.01015625 (old) -> from 2.05 screens in 0.08125.
for k in range(9):
    VB[round(0.43125 + k * 0.01015625, 10)] = 2.05 + k * 0.08125

OLD_LAP_FROM, NEW_LAP_FROM = 0.875, 5.40 / VB_NEW_L
LAP_TS = [k / 36 for k in range(1, 37)] + [0.18, 0.38, 0.55, 0.74, 0.9]

# reveal: old local -> new screens.
RV = {
    0.14: 0.56,
    0.26: 1.04,
    0.29: 1.16,
    0.3: 1.20,
    0.345: 1.38,
    0.4: 1.60,
    0.41: 1.64,
    0.45: 1.80,
    0.52: 2.00,
    0.56: 2.16,
    0.7: 2.64,
    0.85: 2.96,
    1: 3.20,
}


def js_round(v: float, places: int) -> float:
    return math.floor(v * 10**places + 0.5) / 10**places


def fmt(v: float) -> str:
    v = round(v, 12)
    s = repr(v)
    return s[:-2] if s.endswith(".0") else s


def vb_new(old: float) -> str:
    key = round(old, 10)
    if key in VB:
        return fmt(VB[key] / VB_NEW_L)
    if OLD_LAP_FROM < old < 1:
        t_old = (old - OLD_LAP_FROM) / (1 - OLD_LAP_FROM)
        t = min(LAP_TS, key=lambda c: abs(c - t_old))
        if abs(t - t_old) > 1e-6:
            sys.exit(f"vibe-build@{old}: no lap parameter near {t_old}")
        return fmt(js_round(NEW_LAP_FROM + (1 - NEW_LAP_FROM) * t, 8))
    sys.exit(f"vibe-build@{old}: unmapped")


def rv_new(old: float) -> str:
    key = round(old, 10)
    if key in RV:
        return fmt(RV[key] / RV_NEW_L)
    sys.exit(f"reveal@{old}: unmapped")


