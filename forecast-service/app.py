from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

app = Flask(__name__)
CORS(app)

AP_CROPS = {
    "Rice": {"base": 2850, "market": "Guntur", "region": "Andhra Pradesh"},
    "Chilli": {"base": 18200, "market": "Guntur Mirchi Yard", "region": "Andhra Pradesh"},
    "Cotton": {"base": 7100, "market": "Adoni", "region": "Andhra Pradesh"},
    "Groundnut": {"base": 6400, "market": "Anantapur", "region": "Andhra Pradesh"},
    "Maize": {"base": 2250, "market": "Kurnool", "region": "Andhra Pradesh"},
    "Tomato": {"base": 2400, "market": "Madanapalle", "region": "Andhra Pradesh"},
    "Ragi": {"base": 3200, "market": "Chittoor", "region": "Andhra Pradesh"},
    "Wheat": {"base": 2600, "market": "Vijayawada", "region": "Andhra Pradesh"}
}

def generate_series(crop_name):
    meta = AP_CROPS.get(crop_name, {"base": 3000, "market": "Guntur", "region": "Andhra Pradesh"})
    base = meta["base"]
    dates = pd.date_range(end=datetime.now(), periods=180, freq="D")
    np.random.seed(abs(hash(crop_name)) % 10000000)
    
    trend = np.linspace(-0.04, 0.08, len(dates))
    seasonality = np.sin(np.linspace(0, 3 * np.pi, len(dates))) * 0.07
    noise = np.random.normal(0, 0.02, len(dates))
    prices = base * (1 + trend + seasonality + noise)
    
    df = pd.DataFrame({"date": dates, "modal_price": np.round(prices, 2), "market": meta["market"], "region": meta["region"]})
    return df, meta

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    crop = data.get("crop", "Rice")
    horizon = int(data.get("horizon", 30))
    
    df, meta = generate_series(crop)
    df['lag_1'] = df['modal_price'].shift(1)
    df['lag_7'] = df['modal_price'].shift(7)
    df['rolling_mean_7'] = df['modal_price'].shift(1).rolling(window=7).mean()
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    clean_df = df.dropna().copy()
    
    split_idx = int(len(clean_df) * 0.85)
    train, test = clean_df.iloc[:split_idx], clean_df.iloc[split_idx:]
    
    feats = ['lag_1', 'lag_7', 'rolling_mean_7', 'day_of_week', 'month']
    model = lgb.LGBMRegressor(n_estimators=50, max_depth=4, random_state=42, verbose=-1)
    model.fit(train[feats], train['modal_price'])
    
    val_preds = model.predict(test[feats])
    rmse = float(root_mean_squared_error(test['modal_price'], val_preds))
    mae = float(mean_absolute_error(test['modal_price'], val_preds))
    naive_mae = float(mean_absolute_error(test['modal_price'], test['lag_1']))
    
    future_records = []
    curr_df = clean_df.copy()
    last_date = curr_df['date'].iloc[-1]
    
    for step in range(1, horizon + 1):
        target_date = last_date + timedelta(days=step)
        lag1 = curr_df['modal_price'].iloc[-1]
        lag7 = curr_df['modal_price'].iloc[-7] if len(curr_df) >= 7 else lag1
        roll7 = curr_df['modal_price'].tail(7).mean()
        
        row_feat = pd.DataFrame([{'lag_1': lag1, 'lag_7': lag7, 'rolling_mean_7': roll7, 'day_of_week': target_date.weekday(), 'month': target_date.month}])
        pred_val = float(model.predict(row_feat)[0])
        uncertainty = (rmse * 1.28) * np.sqrt(step / 7.0)
        
        future_records.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "predictedPrice": round(pred_val, 2),
            "lowerBound": round(max(0, pred_val - uncertainty), 2),
            "upperBound": round(pred_val + uncertainty, 2)
        })
        curr_df = pd.concat([curr_df, pd.DataFrame([{"date": target_date, "modal_price": pred_val}])], ignore_index=True)
        
    historical = [{"date": d.strftime("%Y-%m-%d"), "price": float(p)} for d, p in zip(clean_df['date'].tail(30), clean_df['modal_price'].tail(30))]
    
    return jsonify({
        "crop": crop,
        "market": meta["market"],
        "region": meta["region"],
        "unit": "₹/quintal",
        "dataFreshness": clean_df['date'].iloc[-1].strftime("%Y-%m-%d"),
        "metrics": {"mae": round(mae, 2), "rmse": round(rmse, 2), "naiveMae": round(naive_mae, 2)},
        "historical": historical,
        "forecast": future_records,
        "model": {"name": "LightGBM", "version": "v1"}
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
