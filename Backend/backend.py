from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase_service import log_verification, update_profile_verification
import cv2
import numpy as np
from verification import verify_student

app = Flask(__name__)
CORS(app)


@app.route('/register', methods=['POST'])
def register():

    # 🔴 1. Validate input properly
    if 'id_card' not in request.files:
        return jsonify({"status": "fail", "errors": ["No ID card uploaded"]}), 400

    if 'roll' not in request.form:
        return jsonify({"status": "fail", "errors": ["Roll number missing"]}), 400

    file = request.files['id_card']
    roll = request.form['roll']

    if file.filename == "":
        return jsonify({"status": "fail", "errors": ["Empty file uploaded"]}), 400

    # 🔴 2. Convert file → image safely
    try:
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if image is None:
            return jsonify({"status": "fail", "errors": ["Invalid image file"]}), 400

    except Exception as e:
        return jsonify({"status": "fail", "errors": [f"Image processing error: {str(e)}"]}), 500

    # 🔴 3. Run verification safely
    try:
        status, extracted_roll, logo_detected, errors = verify_student(
            image, roll)

    except Exception as e:
        return jsonify({
            "status": "fail",
            "errors": [f"Verification error: {str(e)}"]
        }), 500

    user_id = None  # replace later with real user id

    log_verification(
        user_id,
        roll,
        extracted_roll,
        logo_detected,
        status
    )

    if status:
        pass  # disable for now

    # 🔴 4. Return structured response
    if errors:
        return jsonify({
            "status": "fail",
            "errors": errors,
            "extracted_roll": extracted_roll,
            "logo_detected": logo_detected
        }), 200

    return jsonify({
        "status": "success",
        "message": "Student Verified",
        "extracted_roll": extracted_roll,
        "logo_detected": logo_detected
    }), 200


if __name__ == "__main__":
    app.run(debug=True)
