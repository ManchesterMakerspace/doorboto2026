#!/usr/bin/env python3
"""Example USB serial recovery hook.

Replace this stub with site-specific reset logic. The serial device path is
provided as the first argument. Exit zero when recovery succeeds.
"""

import json
import sys


def main() -> int:
    port = sys.argv[1] if len(sys.argv) > 1 else None
    print(json.dumps({"event": "usb_serial_recovery_stub", "port": port}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
