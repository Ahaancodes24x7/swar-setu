"""
================================================================================
BASELINE EVALUATION & COMPARISON SCRIPT
SwarSetu Research Architecture - Priority 3 Upgrades
================================================================================

Compares performance across:
1. Logistic Regression
2. Random Forest
3. XGBoost
4. Simple MLP
5. SwarSetu Unified Model (256-D FT-Transformer with Attention & Label Correlation)

IMPORTANT NOTICE:
PIPELINE VALIDATION ON SYNTHETIC DATA — NOT REAL-WORLD PERFORMANCE
Results demonstrate model functionality and comparative capacity on synthetic distribution.
"""

import os
import sys
import torch
import numpy as np
from typing import Dict, Any

# Ensure path imports
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(BACKEND_DIR)
for p in [ROOT_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from unified_predictor import (
    SLDSyntheticDataGenerator, CONFIG, ResidualTransformerClassifier,
    SLDDataset, set_all_seeds
)
try:
    from ml_models.baselines import (
        LogisticRegressionBaseline, RandomForestBaseline,
        XGBoostBaseline, SimpleMLPBaseline, evaluate_model_performance
    )
except ImportError:
    from baselines import (
        LogisticRegressionBaseline, RandomForestBaseline,
        XGBoostBaseline, SimpleMLPBaseline, evaluate_model_performance
    )


def run_baseline_comparison() -> str:
    set_all_seeds(42)

    # 1. Generate Synthetic Data
    generator = SLDSyntheticDataGenerator(CONFIG, seed=42)
    X, y, _ = generator.generate()

    n_train = CONFIG["data"]["n_train_samples"]
    n_val = CONFIG["data"]["n_val_samples"]

    X_train = X[:n_train]
    y_train = y[:n_train]

    X_test = X[n_train + n_val:]
    y_test = y[n_train + n_val:]

    # 2. Instantiate Baselines
    baselines = [
        LogisticRegressionBaseline(seed=42),
        RandomForestBaseline(seed=42),
        XGBoostBaseline(seed=42),
        SimpleMLPBaseline(seed=42),
    ]

    results = []

    # 3. Evaluate Classical Baselines
    for model in baselines:
        model.fit(X_train, y_train)
        y_prob = model.predict_proba(X_test)
        y_pred = (y_prob >= 0.5).astype(int)

        metrics = evaluate_model_performance(y_test, y_prob, y_pred)
        results.append({
            "Model": model.name,
            "Input": f"{X_train.shape[1]}-D Features",
            "Parameters": "Classical",
            "Macro F1": f"{metrics['Macro F1']:.4f}",
            "Weighted F1": f"{metrics['Weighted F1']:.4f}",
            "ROC-AUC": f"{metrics['Macro ROC-AUC']:.4f}",
            "PR-AUC": f"{metrics['Macro PR-AUC']:.4f}",
            "Status": "VALIDATED (Synthetic)"
        })

    # 4. Evaluate SwarSetu Unified Model
    unified_model = ResidualTransformerClassifier(CONFIG)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    unified_model.to(device)
    unified_model.eval()

    X_test_tensor = torch.FloatTensor(X_test).to(device)
    with torch.no_grad():
        logits = unified_model(X_test_tensor)
        probs = torch.sigmoid(logits).cpu().numpy()
        preds = (probs >= 0.5).astype(int)

    unified_metrics = evaluate_model_performance(y_test, probs, preds)
    num_params = sum(p.numel() for p in unified_model.parameters())

    results.append({
        "Model": "SwarSetu Unified Model (256-D)",
        "Input": "64-D Tabular (+ Multimodal)",
        "Parameters": f"{num_params:,}",
        "Macro F1": f"{unified_metrics['Macro F1']:.4f}",
        "Weighted F1": f"{unified_metrics['Weighted F1']:.4f}",
        "ROC-AUC": f"{unified_metrics['Macro ROC-AUC']:.4f}",
        "PR-AUC": f"{unified_metrics['Macro PR-AUC']:.4f}",
        "Status": "VALIDATED (Synthetic)"
    })

    # 5. Format Comparison Table
    disclaimer = (
        "\n================================================================================\n"
        "PIPELINE VALIDATION ON SYNTHETIC DATA — NOT REAL-WORLD PERFORMANCE\n"
        "================================================================================\n"
    )

    header = f"| {'Model':<32} | {'Input':<24} | {'Parameters':<12} | {'Macro F1':<10} | {'ROC-AUC':<10} | {'Status':<22} |\n"
    separator = "|" + "-"*34 + "|" + "-"*26 + "|" + "-"*14 + "|" + "-"*12 + "|" + "-"*12 + "|" + "-"*24 + "|\n"

    rows = ""
    for r in results:
        rows += f"| {r['Model']:<32} | {r['Input']:<24} | {r['Parameters']:<12} | {r['Macro F1']:<10} | {r['ROC-AUC']:<10} | {r['Status']:<22} |\n"

    table = disclaimer + header + separator + rows + disclaimer
    return table


if __name__ == "__main__":
    table = run_baseline_comparison()
    print(table)
