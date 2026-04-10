import streamlit as st
import requests

st.title("Student ID Verification System")

st.write("Register by uploading your ID card")

# user input
roll_number = st.text_input("Enter Roll Number (Format: SXXCSEUXXXX)")
uploaded_file = st.file_uploader("Upload ID Card", type=["jpg", "png", "jpeg"])


if st.button("Verify and Register"):

    if roll_number == "" or uploaded_file is None:
        st.warning("Please enter roll number and upload ID card")

    else:
        url = "http://127.0.0.1:5000/register"

        files = {
            "id_card": (uploaded_file.name, uploaded_file, uploaded_file.type)
        }

        data = {
            "roll": roll_number
        }

        response = requests.post(url, files=files, data=data)

        if response.status_code == 200:
            result = response.json()

            # 🔴 HANDLE ERRORS FROM BACKEND
            if result["status"] == "fail":
                for err in result["errors"]:
                    st.error(f"❌ {err}")
                st.toast("Verification Failed 🚨")

            else:
                st.success("✅ Verified Successfully")
                st.toast("Student Verified 🎉")

        else:
            st.error("Server error occurred")
