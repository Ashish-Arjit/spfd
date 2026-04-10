from supabase import create_client

SUPABASE_URL = "https://uzjhqouxrendjwvhndrq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6amhxb3V4cmVuZGp3dmhuZHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDAzMDcsImV4cCI6MjA4ODgxNjMwN30.O4vmzgQq7QSjxV5bVsdW42TMvnBRfhMFq--UWaeC4Nk"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def log_verification(user_id, roll, extracted_roll, logo_detected, status):
    data = {
        "roll_entered": roll,
        "roll_extracted": extracted_roll,
        "logo_detected": logo_detected,
        "verified": status
    }
    if user_id is not None:
        data["user_id"] = user_id

    response = supabase.table("id_verification_logs").insert(data).execute()
    return response


def update_profile_verification(user_id, roll, image_path):
    response = supabase.table("profiles").update({
        "verified": True,
        "roll_number": roll,
        "id_card_image": image_path
    }).eq("id", user_id).execute()

    return response
