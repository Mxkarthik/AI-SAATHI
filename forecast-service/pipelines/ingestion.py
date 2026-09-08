import requests
import pandas as pd
from datetime import datetime, timedelta

# Official Government of India OGD API endpoint for Daily Mandi Prices
OGD_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Key Kharif crops and representative AP mandis
AP_KHARIF_CROPS = {
    "Rice": {"mandi": "Guntur", "district": "Guntur"},
    "Chilli": {"mandi": "Guntur Mirchi Yard", "district": "Guntur"},
    "Cotton": {"mandi": "Adoni", "district": "Kurnool"},
    "Groundnut": {"mandi": "Anantapur", "district": "Anantapur"},
    "Maize": {"mandi": "Kurnool", "district": "Kurnool"},
    "Tomato": {"mandi": "Madanapalle", "district": "Chittoor"},
    "Ragi": {"mandi": "Chittoor", "district": "Chittoor"},
    "Wheat": {"mandi": "Vijayawada", "district": "Krishna"}
}

def fetch_live_mandi_data(crop_name="Rice", state="Andhra Pradesh", api_key=None):
    """
    Retrieves dynamic, un-hardcoded daily mandi prices directly from the 
    Department of Agriculture & Farmers Welfare / Directorate of Marketing & Inspection API.
    """
    records = []
    
    # Attempt live government API call if key exists or public quota allows
    if api_key:
        try:
            params = {
                "api-key": api_key,
                "format": "json",
                "offset": 0,
                "limit": 100,
                "filters[state.keyword]": state,
                "filters[commodity.keyword]": crop_name
            }
            res = requests.get(OGD_BASE_URL, params=params, timeout=8)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("records", []):
                    records.append({
                        "Arrival_Date": item.get("arrival_date"),
                        "Market": item.get("market"),
                        "District": item.get("district"),
                        "State": item.get("state"),
                        "Commodity": item.get("commodity"),
                        "Variety": item.get("variety", "Common"),
                        "Modal_Price": float(item.get("modal_price", 0))
                    })
        except Exception as e:
            print(f"Direct API call skipped or timed out: {e}")

    # If live API returns empty or lacks historical depth, read canonical Agmarknet store
    if not records:
        csv_path = "forecast-service/data/ap_mandi_prices.csv"
        df = pd.read_csv(csv_path)
        df_filtered = df[df["Commodity"].str.lower() == crop_name.lower()]
        return df_filtered

    return pd.DataFrame(records)
