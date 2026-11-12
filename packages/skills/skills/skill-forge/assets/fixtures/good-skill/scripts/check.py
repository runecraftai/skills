import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--self-test", action="store_true")
args = parser.parse_args()
if args.self_test:
    Path("scratch-proof.txt").write_text("self-test exercised", encoding="utf-8")
    assert Path("scratch-proof.txt").read_text(encoding="utf-8") == "self-test exercised"
    print("self-test passed")
