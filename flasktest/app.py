from flask import Flask, render_template, redirect, url_for, request, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


# ----------------------
# Database Model
# ----------------------
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ----------------------
# Routes
# ----------------------

@app.route("/")
def home():
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user_exists = User.query.filter_by(username=username).first()
        if user_exists:
            flash("Username already exists!")
            return redirect(url_for("register"))

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash("Registration successful! Please login.")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password.")

    return render_template("login.html")

from flask import send_from_directory
import os
    
import hmac
import hashlib

@app.route("/dashboard")
@login_required
def dashboard():
    # In production, this should match your Django SECRET_KEY
    SHARED_SECRET = 'django-insecure-(5)l+imw=lio-m6&zx6c(9-5v3g3o8ec8kxdfjm1s06xl=nrc6'
    
    # Generate HMAC-SHA256 signature for the current user's username
    signature = hmac.new(
        SHARED_SECRET.encode('utf-8'),
        current_user.username.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return render_template("dashboard.html", user=current_user, identity_signature=signature)


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


import os
import json
import base64
from datetime import datetime

@app.context_processor
def license_context():
    license_path = os.path.join(os.path.dirname(__file__), "CWULicense.txt")

    license_info = None
    if os.path.exists(license_path):
        try:
            with open(license_path, "r") as f:
                lines = f.readlines()

            # Just parse the raw data for the widget to verify
            parsed_data = {}
            signature_b64 = None
            
            in_header = False
            for line in lines:
                line = line.strip()
                if line == "--- CHAT WITH US LICENSE ---":
                    in_header = True
                    continue
                if line == "--- END ---": break
                
                if in_header:
                    if line.startswith("SIGNATURE: "):
                        signature_b64 = line.replace("SIGNATURE: ", "")
                    elif ": " in line:
                        key, val = line.split(": ", 1)
                        parsed_data[key] = val

            if signature_b64 and parsed_data:
                parsed_data["SIGNATURE"] = signature_b64
                license_info = parsed_data

        except Exception as e:
            print(f"[!] Flask license parse error: {e}")

    return {
        "CWU_LICENSE_INFO": license_info
    }

# ----------------------
# Run App
# ----------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', debug=True)