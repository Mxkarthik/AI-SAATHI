import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from pipelines.ingestion import fetch_mandi_observations, AP_MARKET_REGISTRY

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "status": "online",
        "service": "AI-SAATHI Mandi Intelligence Service",
        "crops": list(AP_MARKET_REGISTRY.keys()),
        "endpoints": {"predict": "/predict [POST]"}
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    crop = data.get("crop", "Rice")
    horizon = int(data.get("horizon", 30))

    clean_df, meta = fetch_mandi_observations(crop)

    # Feature Engineering (Lag and Rolling Statistics)
    clean_df['lag_1'] = clean_df['modal_price'].shift(1)
    clean_df['lag_7'] = clean_df['modal_price'].shift(7)
    clean_df['rolling_mean_7'] = clean_df['modal_price'].shift(1).rolling(7).mean()
    clean_df['day_of_week'] = clean_df['date'].dt.dayofweek
    clean_df['month'] = clean_df['date'].dt.month

    valid_df = clean_df.dropna().copy()

    # Time-Series Split (80% Train / 20% Test)
    split_idx = int(len(valid_df) * 0.8)
    train, test = valid_df.iloc[:split_idx], valid_df.iloc[split_idx:]
    features = ['lag_1', 'lag_7', 'rolling_mean_7', 'day_of_week', 'month']

    model = lgb.LGBMRegressor(n_estimators=50, max_depth=3, random_state=42, verbose=-1)
    model.fit(train[features], train['modal_price'])

    # Validate against naive baseline
    test_preds = model.predict(test[features])
    rmse = float(root_mean_squared_error(test['modal_price'], test_preds))
    mae = float(mean_absolute_error(test['modal_price'], test_preds))
    naive_mae = float(mean_absolute_error(test['modal_price'], test['lag_1']))

    # Recursive Horizon Prediction with Confidence Intervals
    future = []
    tracker = valid_df.copy()
    last_date = tracker['date'].iloc[-1]

    for step in range(1, horizon + 1):
        dt = last_date + timedelta(days=step)
        l1 = tracker['modal_price'].iloc[-1]
        l7 = tracker['modal_price'].iloc[-7] if len(tracker) >= 7 else l1
        r7 = tracker['modal_price'].tail(7).mean()

        row = pd.DataFrame([{'lag_1': l1, 'lag_7': l7, 'rolling_mean_7': r7, 'day_of_week': dt.weekday(), 'month': dt.month}])
        pred = float(model.predict(row)[0])
        spread = (rmse * 1.25) * np.sqrt(step / 7.0)

        future.append({
            "date": dt.strftime("%Y-%m-%d"),
            "predictedPrice": round(pred, 2),
            "lowerBound": round(max(0, pred - spread), 2),
            "upperBound": round(pred + spread, 2)
        })
        tracker = pd.concat([tracker, pd.DataFrame([{"date": dt, "modal_price": pred}])], ignore_index=True)

    historical_records = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(valid_df['date'].tail(30), valid_df['modal_price'].tail(30))
    ]

    return jsonify({
        "crop": crop,
        "market": meta["mandi"],
        "region": f"{meta['district']}, {meta['state']}",
        "unit": "₹/quintal",
        "dataFreshness": valid_df['date'].iloc[-1].strftime("%Y-%m-%d"),
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "naiveMae": round(naive_mae, 2),
            "confidence": "High" if mae <= naive_mae else "Moderate"
        },
        "historical": historical_records,
        "forecast": future
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
