#!/usr/bin/env python3

import os
import re
import subprocess
import time
import sys

UNBIND = "/sys/bus/usb/drivers/usb/unbind"
BIND   = "/sys/bus/usb/drivers/usb/bind"

RESET_DELAY = 1.0

STORAGE_CLASSES = {
    "Mass Storage",
}

STORAGE_DRIVERS = {
    "usb-storage",
    "uas",
}

# Resetting hubs can disconnect whole branches of the USB tree.
EXCLUDED_CLASSES = {
    "root_hub",
    "Hub",
}


def get_lsusb_tree():
    result = subprocess.run(
        ["lsusb", "-t"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def parse_lsusb_tree(text):
    """
    Parse lsusb -t output and return:

        {
            "1-1.3": {
                "classes": {"Vendor Specific Class"},
                "drivers": {"cp210x"},
            },
            ...
        }

    The sysfs USB device name is reconstructed from the USB topology.
    """

    devices = {}

    current_bus = None

    # stack[level] = port number
    port_stack = []

    for line in text.splitlines():

        # Root bus line:
        #
        # /:  Bus 001.Port 001: Dev 001, Class=root_hub,...
        #
        bus_match = re.search(r"Bus\s+(\d+)\.Port", line)

        if line.startswith("/:") and bus_match:
            current_bus = int(bus_match.group(1))
            port_stack = []
            continue

        if current_bus is None:
            continue

        # Example:
        #
        #     |__ Port 3: Dev 4, If 0, Class=Vendor Specific Class,
        #         Driver=cp210x, 12M
        #
        port_match = re.search(r"Port\s+(\d+):", line)
        if not port_match:
            continue

        port = int(port_match.group(1))

        # lsusb -t uses 4 spaces for each USB tree level.
        prefix = line[: line.find("|__")] if "|__" in line else ""
        level = len(prefix) // 4

        # level 1 = directly attached to root hub
        stack_index = max(level - 1, 0)

        if len(port_stack) > stack_index:
            port_stack = port_stack[:stack_index]

        if len(port_stack) == stack_index:
            port_stack.append(port)
        else:
            # Shouldn't normally happen, but avoid malformed topology.
            continue

        path = (
            f"{current_bus}-"
            + ".".join(str(p) for p in port_stack)
        )

        class_match = re.search(
            r"Class=([^,]+)",
            line
        )

        driver_match = re.search(
            r"Driver=([^,\s]+)",
            line
        )

        usb_class = (
            class_match.group(1).strip()
            if class_match else None
        )

        driver = (
            driver_match.group(1).strip()
            if driver_match else None
        )

        dev = devices.setdefault(
            path,
            {
                "classes": set(),
                "drivers": set(),
            }
        )

        if usb_class:
            dev["classes"].add(usb_class)

        if driver:
            dev["drivers"].add(driver)

    return devices


def is_storage(info):
    if info["classes"] & STORAGE_CLASSES:
        return True

    if info["drivers"] & STORAGE_DRIVERS:
        return True

    return False


def is_excluded(info):
    return bool(info["classes"] & EXCLUDED_CLASSES)


def usb_device_exists(device):
    return os.path.exists(f"/sys/bus/usb/devices/{device}")


def reset_usb_device(device):
    print(f"Unbinding {device}")

    with open(UNBIND, "w") as f:
        f.write(device)

    time.sleep(RESET_DELAY)

    print(f"Rebinding {device}")

    with open(BIND, "w") as f:
        f.write(device)


def main():

    if os.geteuid() != 0:
        print(
            "This script must be run as root.",
            file=sys.stderr,
        )
        sys.exit(1)

    tree = get_lsusb_tree()

    print("USB topology:")
    print()
    print(tree)

    devices = parse_lsusb_tree(tree)

    candidates = []

    for device, info in devices.items():

        classes = ", ".join(sorted(info["classes"]))
        drivers = ", ".join(sorted(info["drivers"]))

        if is_storage(info):
            print(
                f"SKIP storage  {device:12} "
                f"Class={classes} Driver={drivers}"
            )
            continue

        if is_excluded(info):
            print(
                f"SKIP hub      {device:12} "
                f"Class={classes} Driver={drivers}"
            )
            continue

        if not usb_device_exists(device):
            print(
                f"SKIP missing  {device:12}"
            )
            continue

        print(
            f"RESET          {device:12} "
            f"Class={classes} Driver={drivers}"
        )

        candidates.append(device)

    print()

    for device in candidates:
        try:
            reset_usb_device(device)

        except OSError as e:
            print(
                f"Failed resetting {device}: {e}",
                file=sys.stderr,
            )


if __name__ == "__main__":
    main()
