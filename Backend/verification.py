import cv2
import re
import numpy as np
import pytesseract

import platform

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
else:
    # On Mac/Linux, try to find it in common locations or use default
    pytesseract.pytesseract.tesseract_cmd = r"/opt/homebrew/bin/tesseract"

# roll number pattern
ROLL_PATTERN = r'S\d{2}CSEU\d{4}'


def extract_roll_number(image):

    # Convert to grayscale FIRST
    img_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    h, w = img_gray.shape

    # Crop roll number region (bottom-right for your vertical card)
    roll_region = img_gray[
        int(h*0.70):h,
        int(w*0.50):w
    ]

    text = pytesseract.image_to_string(roll_region)

    print("OCR Text:", text)

    match = re.search(ROLL_PATTERN, text)

    if match:
        return match.group()

    return None


def normalize(text):
    if text is None:
        return None
    return text.replace(" ", "").replace("\n", "").upper().strip()


def verify_student(image, entered_roll):

    # 1. Extract FIRST
    extracted_roll = extract_roll_number(image)

    # 2. Normalize AFTER extraction
    extracted_roll = normalize(extracted_roll)
    entered_roll = normalize(entered_roll)

    # 3. Logo check
    logo_detected = verify_logo(image, "static/images/reference_logo.png")

    # 4. Error handling
    errors = []

    if extracted_roll != entered_roll:
        errors.append(f"Roll Number Mismatch (Extracted: {extracted_roll})")

    if not logo_detected:
        errors.append("Logo Not Detected")

    status = len(errors) == 0

    return status, extracted_roll, logo_detected, errors


def verify_logo(image, reference_logo_path):

    logo = cv2.imread(reference_logo_path)

    if logo is None:
        print("Logo not found")
        return False

    # Convert to grayscale
    img_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    logo_gray = cv2.cvtColor(logo, cv2.COLOR_BGR2GRAY)

    max_val_global = 0

    # Try multiple scales of logo
    for scale in np.linspace(0.2, 1.0, 10):  # 20% → 100%

        resized_logo = cv2.resize(
            logo_gray,
            (int(logo_gray.shape[1]*scale), int(logo_gray.shape[0]*scale))
        )

        if resized_logo.shape[0] > img_gray.shape[0] or resized_logo.shape[1] > img_gray.shape[1]:
            continue

        result = cv2.matchTemplate(
            img_gray, resized_logo, cv2.TM_CCOEFF_NORMED)

        _, max_val, _, _ = cv2.minMaxLoc(result)

        if max_val > max_val_global:
            max_val_global = max_val

    print("Max Logo Similarity:", max_val_global)

    return max_val_global > 0.45
