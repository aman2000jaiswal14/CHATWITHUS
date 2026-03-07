# WCA Secure Chat - Automatic Testing Tool (ATT)

The ATT is a unified testing infrastructure located in the `TEST_SETUP` directory. It provides a single interface for running unit, E2E, load, and security tests.

## 🚀 Quick Start

1.  **Initialize the Environment**:
    ```bash
    bash TEST_SETUP/test_env_setup.sh
    ```

2.  **Start the Web Dashboard**:
    ```bash
    python3 TEST_SETUP/venv/bin/python TEST_SETUP/test_dashboard.py
    ```
    Access the UI at: `http://localhost:8003`

3.  **Run via CLI**:
    ```bash
    python3 TEST_SETUP/test_runner.py --all
    ```

## 🛠️ Individual Test Commands

| Layer | Command | Focus |
| :--- | :--- | :--- |
| **Backend** | `python3 TEST_SETUP/test_runner.py --backend` | Django unit tests + Coverage |
| **Frontend** | `python3 TEST_SETUP/test_runner.py --frontend` | React unit tests (Vitest) |
| **End-to-End** | `python3 TEST_SETUP/test_runner.py --e2e` | Playwright browser tests |
| **Load** | `python3 TEST_SETUP/test_runner.py --load` | Locust scale testing (30s smoke test) |
| **Security** | `python3 TEST_SETUP/test_runner.py --security` | Bandit (Python) + npm audit (JS) |

## 📊 Coverage & Reports

-   **Backend Coverage**: HTML reports generated in `TEST_SETUP/reports/backend_coverage/index.html`.
-   **Security Report**: High-level summary in `TEST_SETUP/reports/security_report.txt`.

## 🧪 Adding New Tests

-   **Backend**: Add `test_*.py` files in `Main Application/` (e.g., in `chat/` or `accounts/`).
-   **Frontend**: Add `*.test.jsx` or `*.spec.jsx` files in `frontend/src/`.
-   **E2E**: Modify `TEST_SETUP/e2e_tests.py` to add browser interactions.
-   **Load**: Add tasks to `TEST_SETUP/locustfile.py`.

---

> [!NOTE]
> E2E and Load tests require the application server to be running at `http://localhost:8000`.
