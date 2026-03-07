import sys
import os
import subprocess
import argparse
import json
from datetime import datetime

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "Main Application")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
TEST_SETUP_DIR = os.path.join(BASE_DIR, "TEST_SETUP")
VENV_PYTHON = os.path.join(TEST_SETUP_DIR, "venv", "bin", "python")
REPORTS_DIR = os.path.join(TEST_SETUP_DIR, "reports")
STATUS_FILE = os.path.join(TEST_SETUP_DIR, "status.json")

OUTPUT_LOG = os.path.join(REPORTS_DIR, "output.log")

REPORT_DATA_FILE = os.path.join(REPORTS_DIR, "report_data.json")

def update_status(step, status, details=None, cases=None):
    current_status = {}
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r') as f:
                current_status = json.load(f)
        except:
            pass
    
    current_status[step] = {
        "status": status,
        "details": details,
        "cases": cases or [],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(current_status, f, indent=4)

def update_report_data(suite, passed=0, failed=0, total=0, coverage=None, extra=None):
    data = {}
    if os.path.exists(REPORT_DATA_FILE):
        try:
            with open(REPORT_DATA_FILE, 'r') as f:
                data = json.load(f)
        except:
            pass
    
    data[suite] = {
        "passed": passed,
        "failed": failed,
        "total": total,
        "coverage": coverage,
        "extra": extra,
        "last_run": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(REPORT_DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def get_suggested_solution(error_text, default_hint=""):
    error_text = str(error_text).lower()
    if "bandit" in error_text or "issue: [" in error_text:
        return "Review bandit security warnings (e.g., pickle usage) and refactor."
    if "npm audit" in error_text or "vulnerabilities" in error_text:
        return "Run npm audit fix to resolve security vulnerabilities."
    if "404 client error" in error_text or "not found" in error_text:
        return "Verify API endpoint URL/router config."
    if "timeout" in error_text or "time out" in error_text:
        return "Increase timeout limit or optimize load."
    if "connection refused" in error_text:
        return "Ensure the test server/db is running."
    if "missing" in error_text and "module" in error_text:
        return "Install missing dependency."
    if "syntaxerror" in error_text:
        return "Fix syntax error in the source code."
    if "assertionerror" in error_text or default_hint == "pytest":
        return "Check pytest assertion. Review backend logic."
    if "expect(" in error_text or default_hint == "vitest":
        return "Check React component rendering/assertions."
    return "Review verbose logs to identify exact cause."

def run_command(command, cwd=None, env=None, step_name=None):
    print(f"Executing: {' '.join(command)} in {cwd or 'current dir'}")
    if step_name:
        update_status(step_name, "RUNNING")
        
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        output_buffer = []
        with open(OUTPUT_LOG, "a") as log_file:
            log_file.write(f"\n--- STARTING STEP: {step_name or 'unnamed'} ---\n")
            if process.stdout:
                for line in process.stdout:
                    print(line, end="")
                    log_file.write(line)
                    log_file.flush()
                    output_buffer.append(line)
        process.wait()
        
        full_output = "".join(output_buffer)
        success = process.returncode == 0
        
        cases = []
        if step_name == "Backend":
            import re
            passed_match = re.search(r"(\d+) passed", full_output)
            failed_match = re.search(r"(\d+) failed", full_output)
            cov_match = re.search(r"TOTAL\s+\d+\s+\d+\s+(\d+)%", full_output)
            
            passed = int(passed_match.group(1)) if passed_match else 0
            failed = int(failed_match.group(1)) if failed_match else 0
            cov = int(cov_match.group(1)) if cov_match else None
            update_report_data("Backend", passed, failed, passed + failed, cov)
            
            # Extract individual cases
            case_matches = re.finditer(r"^([^ ]+::[^ ]+)\s+(PASSED|FAILED|ERROR)", full_output, re.MULTILINE)
            for m in case_matches:
                name = m.group(1).split("::")[-1]
                status = m.group(2)
                cases.append({
                    "name": name,
                    "status": status,
                    "error": "Assertion failed or error" if status != "PASSED" else "",
                    "solution": get_suggested_solution(full_output, "pytest") if status != "PASSED" else ""
                })

        elif step_name == "Frontend":
            import re
            passed_match = re.search(r"Tests\s+(\d+) passed", full_output)
            failed_match = re.search(r"Tests\s+(\d+) failed", full_output)
            passed = int(passed_match.group(1)) if passed_match else 0
            failed = int(failed_match.group(1)) if failed_match else 0
            update_report_data("Frontend", passed, failed, passed + failed)
            
            # Extract individual cases
            case_matches = re.finditer(r"^\s*([✓✕x])\s+(.*)$", full_output, re.MULTILINE)
            for m in case_matches:
                symbol = m.group(1)
                name = m.group(2).strip()
                status = "PASSED" if symbol == "✓" else "FAILED"
                cases.append({
                    "name": name[:50],
                    "status": status,
                    "error": "Test failed" if status != "PASSED" else "",
                    "solution": get_suggested_solution(full_output, "vitest") if status != "PASSED" else ""
                })

        else:
            status_str = "PASSED" if success else "FAILED"
            cases.append({
                "name": f"{step_name} Execution",
                "status": status_str,
                "error": full_output[-150:].replace("\n", " ").strip() if not success else "",
                "solution": get_suggested_solution(full_output) if not success else ""
            })

        if step_name:
            update_status(step_name, "PASSED" if success else "FAILED", full_output[-500:], cases)
        return success
    except Exception as e:
        print(f"Error executing command: {e}")
        if step_name:
            update_status(step_name, "ERROR", str(e), [{"name": "Execution", "status": "ERROR", "error": str(e), "solution": "Check execution environment"}])
        return False

def setup_reports():
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    if not os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, 'w') as f:
            json.dump({}, f)
    
    with open(OUTPUT_LOG, 'w') as f:
        f.write(f"Test Run started at {datetime.now()}\n")

def run_backend_tests():
    print("\n--- Running Backend Tests (Pytest) ---")
    cmd = [VENV_PYTHON, "-m", "pytest", "-v", "--cov=" + BACKEND_DIR, BACKEND_DIR]
    return run_command(cmd, cwd=BACKEND_DIR, step_name="Backend")

def run_frontend_tests():
    print("\n--- Running Frontend Tests (Vitest) ---")
    cmd = ["npm", "test", "--", "--run", "--reporter=verbose"]
    return run_command(cmd, cwd=FRONTEND_DIR, step_name="Frontend")

def run_security_tests():
    print("\n--- Running Security Tests ---")
    cmd = [VENV_PYTHON, "-m", "bandit", "-r", BACKEND_DIR, "-v"]
    backend_ok = run_command(cmd, step_name="Security (Backend)")
    frontend_ok = run_command(["npm", "audit"], cwd=FRONTEND_DIR, step_name="Security (Frontend)")
    return backend_ok and frontend_ok

def run_load_tests():
    print("\n--- Running Load Tests (Locust) ---")
    locust_file = os.path.join(TEST_SETUP_DIR, "locustfile.py")
    cmd = [VENV_PYTHON, "-m", "locust", "-f", locust_file, "--headless", "-u", "5", "-r", "1", "-t", "5s", "--host", "http://localhost:8000"]
    return run_command(cmd, step_name="Load")

def run_e2e_tests():
    print("\n--- Running E2E Tests (Playwright) ---")
    e2e_file = os.path.join(TEST_SETUP_DIR, "e2e_tests.py")
    cmd = [VENV_PYTHON, e2e_file]
    return run_command(cmd, step_name="E2E")

def generate_pdf_report(results):
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(190, 10, "WCA Cumulative Test Report", 0, 1, 'C')
        pdf.set_font("Arial", '', 10)
        pdf.cell(190, 10, f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1, 'C')
        pdf.ln(5)
        
        for name, data in results.items():
            status = data.get("status", "UNKNOWN")
            pdf.set_font("Arial", 'B', 12)
            if status == "PASSED":
                pdf.set_text_color(34, 197, 94)
            else:
                pdf.set_text_color(239, 68, 68)
            pdf.cell(190, 10, f"{name}: {status}", 0, 1, 'L')
            pdf.set_text_color(0, 0, 0)
            
            cases = data.get("cases", [])
            if cases:
                pdf.set_font("Arial", 'B', 8)
                pdf.cell(50, 8, "Test Case", 1)
                pdf.cell(20, 8, "Status", 1)
                pdf.cell(50, 8, "Error", 1)
                pdf.cell(70, 8, "Suggested Solution", 1)
                pdf.ln()
                
                pdf.set_font("Arial", '', 8)
                for c in cases:
                    c_name = str(c.get('name', 'Unknown'))[:30]
                    c_status = c.get('status', 'UNKNOWN')
                    c_err = str(c.get('error', ''))[:30]
                    c_sol = str(c.get('solution', ''))[:40]
                    
                    pdf.cell(50, 8, c_name, 1)
                    if c_status == "PASSED":
                        pdf.set_text_color(34, 197, 94)
                    else:
                        pdf.set_text_color(239, 68, 68)
                    pdf.cell(20, 8, c_status, 1)
                    pdf.set_text_color(0, 0, 0)
                    pdf.cell(50, 8, c_err, 1)
                    pdf.cell(70, 8, c_sol, 1)
                    pdf.ln()
            else:
                pdf.set_font("Arial", 'I', 10)
                pdf.cell(190, 8, "No detailed cases available.", 0, 1)
            pdf.ln(5)

        report_path = os.path.join(REPORTS_DIR, "summary.pdf")
        pdf.output(report_path)
    except Exception as e:
        print(f"Error generating PDF: {e}")

def generate_markdown_report(results):
    report_path = os.path.join(REPORTS_DIR, "summary.md")
    with open(report_path, "w") as f:
        f.write("# WCA Cumulative Test Report\n\n")
        f.write(f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        for name, data in results.items():
            status_val = data.get("status", "UNKNOWN")
            status_str = "✅ " + status_val if status_val == "PASSED" else "❌ " + status_val
            f.write(f"## {name} : {status_str}\n\n")
            
            cases = data.get("cases", [])
            if cases:
                f.write("| Test Case | Status | Error Details | Suggested Solution |\n")
                f.write("| :--- | :--- | :--- | :--- |\n")
                for c in cases:
                    c_name = str(c.get('name', 'Unknown')).replace('|', '\\|')
                    c_status = str(c.get('status', 'UNKNOWN'))
                    c_str = "✅ " + c_status if c_status == "PASSED" else "❌ " + c_status
                    c_error = str(c.get('error', '')).replace('|', '\\|').replace('\n', ' ')
                    c_sol = str(c.get('solution', '')).replace('|', '\\|').replace('\n', ' ')
                    f.write(f"| {c_name} | {c_str} | {c_error} | {c_sol} |\n")
                f.write("\n")
            else:
                f.write("No detailed cases available.\n\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", action="store_true")
    parser.add_argument("--frontend", action="store_true")
    parser.add_argument("--security", action="store_true")
    parser.add_argument("--load", action="store_true")
    parser.add_argument("--e2e", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--clean", action="store_true", help="Clear all previous results")
    args = parser.parse_args()

    if args.clean:
        if os.path.exists(STATUS_FILE): os.remove(STATUS_FILE)
        if os.path.exists(REPORT_DATA_FILE): os.remove(REPORT_DATA_FILE)

    setup_reports()
    
    # Load existing results to prevent wiping them
    results = {}
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r') as f:
                results = json.load(f)
        except: pass

    if args.all or args.backend: run_backend_tests()
    if args.all or args.frontend: run_frontend_tests()
    if args.all or args.security: run_security_tests()
    if args.all or args.load: run_load_tests()
    if args.all or args.e2e: run_e2e_tests()

    # Reload merged results for reporting
    try:
        with open(STATUS_FILE, 'r') as f:
            results = json.load(f)
    except: pass

    generate_markdown_report(results)
    generate_pdf_report(results)

    print("\n" + "="*30)
    print("      TEST SUMMARY RESULT")
    print("="*30)
    all_passed = True
    for test, data in results.items():
        if isinstance(data, dict):
            status = data.get("status", "UNKNOWN")
        else:
            status = "PASSED" if data else "FAILED"
            
        print(f"{test:15}: {status}")
        if status != "PASSED":
            all_passed = False
    print("="*30)
    
    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
