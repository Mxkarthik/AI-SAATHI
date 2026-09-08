import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

app = Flask(__name__)
CORS(app)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "ap_mandi_prices.csv")

def load_and_clean_mandi_data(crop_name):
    """
    Ingests canonical Agmarknet market observations:
    - Normalizes commodity names
    - Removes duplicate observations
    - Handles missing values without silently defaulting to zero
    - Re-indexes to uniform daily frequency
    """
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Mandi dataset not found at {DATA_PATH}")

    raw_df = pd.read_csv(DATA_PATH)
    
    # Filter by commodity
    df = raw_df[raw_df["Commodity"].str.strip().str.lower() == crop_name.strip().lower()].copy()
    if df.empty:
        # Fallback to Rice if unknown crop requested
        df = raw_df[raw_df["Commodity"] == "Rice"].copy()

    # Drop duplicates by Market + Date
    df["Arrival_Date"] = pd.to_datetime(df["Arrival_Date"])
    df = df.sort_values("Arrival_Date").drop_duplicates(subset=["Market", "Arrival_Date"])
    
    # Extract market metadata
    market_name = df["Market"].iloc[-1]
    region_name = df["State"].iloc[-1]
    
    # Modal price is primary forecasting target
    df = df.set_index("Arrival_Date")[["Modal_Price"]].rename(columns={"Modal_Price": "modal_price"})
    
    # Forward-fill gaps up to current date to maintain continuous daily time-series
    full_idx = pd.date_range(start=df.index.min(), end=datetime.now(), freq="D")
    daily_df = df.reindex(full_idx).interpolate(method="time").ffill().bfill()
    daily_df = daily_df.reset_index().rename(columns={"index": "date"})
    
    return daily_df, market_name, region_name

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "service": "AI-SAATHI Real Mandi Price Forecasting API",
        "dataset": "Directorate of Marketing and Inspection (Agmarknet / OGD)",
        "endpoints": {"predict": "/predict [POST]"}
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    crop = data.get("crop", "Rice")
    horizon = int(data.get("horizon", 30))
    
    df, market, region = load_and_clean_mandi_data(crop)
    
    # Feature Engineering (Lags, Rolling Means, Calendar Features)
    df['lag_1'] = df['modal_price'].shift(1)
    df['lag_7'] = df['modal_price'].shift(7)
    df['rolling_mean_7'] = df['modal_price'].shift(1).rolling(window=7).mean()
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    clean_df = df.dropna().copy()
    
    # Time-series Chronological Train/Test Split (No random shuffling)
    split_idx = int(len(clean_df) * 0.80)
    train, test = clean_df.iloc[:split_idx], clean_df.iloc[split_idx:]
    
    features = ['lag_1', 'lag_7', 'rolling_mean_7', 'day_of_week', 'month']
    model = lgb.LGBMRegressor(n_estimators=40, max_depth=3, random_state=42, verbose=-1)
    model.fit(train[features], train['modal_price'])
    
    # Evaluation vs Naive Baseline (Last Price)
    val_preds = model.predict(test[features])
    rmse = float(root_mean_squared_error(test['modal_price'], val_preds))
    mae = float(mean_absolute_error(test['modal_price'], val_preds))
    naive_mae = float(mean_absolute_error(test['modal_price'], test['lag_1']))
    
    # Recursive Multi-step Horizon Forecasting with Empirical Uncertainty Intervals
    future_records = []
    curr_df = clean_df.copy()
    last_date = curr_df['date'].iloc[-1]
    
    for step in range(1, horizon + 1):
        target_date = last_date + timedelta(days=step)
        lag1 = curr_df['modal_price'].iloc[-1]
        lag7 = curr_df['modal_price'].iloc[-7] if len(curr_df) >= 7 else lag1
        roll7 = curr_df['modal_price'].tail(7).mean()
        
        row_feat = pd.DataFrame([{
            'lag_1': lag1,
            'lag_7': lag7,
            'rolling_mean_7': roll7,
            'day_of_week': target_date.weekday(),
            'month': target_date.month
        }])
        
        pred_val = float(model.predict(row_feat)[0])
        uncertainty = (rmse * 1.28) * np.sqrt(step / 7.0)
        
        future_records.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "predictedPrice": round(pred_val, 2),
            "lowerBound": round(max(0, pred_val - uncertainty), 2),
            "upperBound": round(pred_val + uncertainty, 2)
        })
        
        curr_df = pd.concat([curr_df, pd.DataFrame([{"date": target_date, "modal_price": pred_val}])], ignore_index=True)
        
    historical = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(clean_df['date'].tail(30), clean_df['modal_price'].tail(30))
    ]
    
    return jsonify({
        "crop": crop,
        "market": market,
        "region": region,
        "unit": "₹/quintal",
        "dataFreshness": clean_df['date'].iloc[-1].strftime("%Y-%m-%d"),
        "source": "Government of India Mandi Data (Agmarknet/OGD)",
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "naiveBaselineMae": round(naive_mae, 2)
        },
        "historical": historical,
        "forecast": future_records,
        "model": {"name": "LightGBM", "version": "v1"}
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
