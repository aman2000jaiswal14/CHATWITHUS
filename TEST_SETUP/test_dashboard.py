from flask import Flask, render_template, jsonify, request, send_file
import subprocess
import os
import json
import threading
import signal

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_SETUP_DIR = os.path.join(BASE_DIR, "TEST_SETUP")
STATUS_FILE = os.path.join(TEST_SETUP_DIR, "status.json")
REPORTS_DIR = os.path.join(TEST_SETUP_DIR, "reports")
OUTPUT_LOG = os.path.join(REPORTS_DIR, "output.log")
RUNNER_SCRIPT = os.path.join(TEST_SETUP_DIR, "test_runner.py")
VENV_PYTHON = os.path.join(TEST_SETUP_DIR, "venv", "bin", "python")

# Global variable to track if a test is running
running_process = None

def run_tests_thread(args):
    global running_process
    cmd = [VENV_PYTHON, RUNNER_SCRIPT] + args
    # Use start_new_session=True to create a new process group
    running_process = subprocess.Popen(
        cmd, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT,
        start_new_session=True
    )
    running_process.wait()
    running_process = None

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/testWCA/api/status')
def get_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r') as f:
                return jsonify(json.load(f))
        except:
            pass
    return jsonify({})

@app.route('/testWCA/api/run', methods=['POST'])
def start_tests():
    global running_process
    if running_process:
        return jsonify({"error": "Tests already running"}), 400
    
    test_type = request.json.get('type', 'all')
    args = []
    if test_type == 'all':
        args = ['--all']
    elif test_type == 'backend':
        args = ['--backend']
    elif test_type == 'frontend':
        args = ['--frontend']
    elif test_type == 'security':
        args = ['--security']
    elif test_type == 'load':
        args = ['--load']
    elif test_type == 'e2e':
        args = ['--e2e']
        
    thread = threading.Thread(target=run_tests_thread, args=(args,))
    thread.start()
    return jsonify({"message": f"Tests ({test_type}) started"})

@app.route('/testWCA/api/stop', methods=['POST'])
def stop_tests():
    global running_process
    if running_process:
        try:
            # Kill the entire process group
            os.killpg(os.getpgid(running_process.pid), signal.SIGTERM)
            return jsonify({"message": "Stop signal sent"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "No tests running"}), 400

@app.route('/testWCA/api/logs')
def get_logs():
    if os.path.exists(OUTPUT_LOG):
        try:
            with open(OUTPUT_LOG, 'r') as f:
                # Return last 200 lines to keep it snappy
                lines = f.readlines()
                return jsonify({"logs": "".join(lines[-200:])})
        except:
            pass
    return jsonify({"logs": "No logs found."})

@app.route('/testWCA/api/report/data')
def get_report_data():
    report_path = os.path.join(REPORTS_DIR, "report_data.json")
    if os.path.exists(report_path):
        try:
            with open(report_path, 'r') as f:
                return jsonify(json.load(f))
        except:
            pass
    return jsonify({})

@app.route('/testWCA/api/report/pdf')
def download_pdf():
    pdf_path = os.path.join(REPORTS_DIR, "summary.pdf")
    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=False)
    return jsonify({"error": "PDF report not found"}), 404

@app.route('/testWCA/api/is_running')
def is_running():
    return jsonify({"running": running_process is not None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8003, debug=True)
