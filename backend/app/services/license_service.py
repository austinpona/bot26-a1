from datetime import datetime


# In production: validate against a license server or database of valid keys.
# For now we validate format and treat all well-formed keys as valid for 1 year.
def parse_license(key: str) -> dict:
    key = key.strip().upper()
    if len(key) < 10:
        return {"valid": False, "reason": "Invalid license key"}
    from datetime import timedelta
    expires_at = datetime.utcnow() + timedelta(days=365)
    return {"valid": True, "expires_at": expires_at, "status": "ACTIVE"}
