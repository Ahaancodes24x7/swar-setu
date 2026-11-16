from flask import Blueprint, jsonify, request
import os
import sys
import copy
import json
import time
import threading
import logging
from datetime import datetime
import numpy as np
import torch
import torch.optim as optim
from torch.utils.data import DataLoader

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
for p in [ROOT_DIR, BASE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from unified_predictor import (
        ResidualTransformerClassifier, CONFIG, AsymmetricLoss,
        SLDSyntheticDataGenerator, SLDDataset, SLDTrainer,
        YoudensJThresholdOptimizer, set_all_seeds
    )
    from ai.inference_engine import get_inference_engine
except ImportError:
    from unified_predictor import (
        ResidualTransformerClassifier, CONFIG, AsymmetricLoss,
        SLDSyntheticDataGenerator, SLDDataset, SLDTrainer,
        YoudensJThresholdOptimizer, set_all_seeds
    )
    from ai.inference_engine import get_inference_engine

logger = logging.getLogger("TrainingRoute")
training_bp = Blueprint('training', __name__)

STATUS_FILE_PATH = os.path.join(BASE_DIR, "ai", "training_status.json")
IS_TRAINING = False
TRAINING_LOCK = threading.Lock()


def write_status(data: dict) -> None:
    try:
        data["updated_at"] = datetime.now().isoformat()
        temp_file = f"{STATUS_FILE_PATH}.tmp"
        with open(temp_file, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(temp_file, STATUS_FILE_PATH)
    except Exception as e:
        logger.error(f"Error writing training status file: {e}")


def read_status() -> dict:
    if os.path.exists(STATUS_FILE_PATH):
        try:
            with open(STATUS_FILE_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading training status file: {e}")

    return {
        "status": "idle",
        "message": "No active or previous training run recorded.",
        "architecture": "Residual FT-Transformer Classifier",
        "target_disorders": ["Dyslexia", "Dyscalculia", "Dysgraphia"],
        "input_dim": 64
    }


def background_training_task(num_epochs: int = 50) -> None:
    global IS_TRAINING
    try:
        logger.info("[TRAINING] Initiating PyTorch background training sequence...")
        set_all_seeds(CONFIG["device"]["seed"])
        device = torch.device(CONFIG["device"]["device_type"])

        status_data = {
            "status": "training",
            "start_time": datetime.now().isoformat(),
            "architecture": "Residual FT-Transformer Classifier",
            "device": str(device),
            "current_epoch": 0,
            "total_epochs": num_epochs,
            "progress_pct": 0.0,
            "history": {
                "train_loss": [],
                "val_loss": [],
                "val_auc": [],
                "learning_rate": []
            },
            "youdens_j_thresholds": [0.5, 0.5, 0.5]
        }
        write_status(status_data)

        # Step 1: Generate Synthetic Data
        generator = SLDSyntheticDataGenerator(CONFIG, seed=CONFIG["device"]["seed"])
        X, y, metadata = generator.generate()

        n_train = CONFIG["data"]["n_train_samples"]
        n_val = CONFIG["data"]["n_val_samples"]

        X_train, y_train = X[:n_train], y[:n_train]
        X_val, y_val = X[n_train:n_train+n_val], y[n_train:n_train+n_val]

        train_dataset = SLDDataset(X_train, y_train, scaler=None, is_train=True)
        val_dataset = SLDDataset(X_val, y_val, scaler=train_dataset.scaler)

        train_loader = DataLoader(train_dataset, batch_size=CONFIG["training"]["batch_size"], shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=CONFIG["training"]["batch_size"])

        model = ResidualTransformerClassifier(CONFIG).to(device)
        loss_fn = AsymmetricLoss(
            gamma_pos=CONFIG["loss"]["gamma_pos"],
            gamma_neg=CONFIG["loss"]["gamma_neg"]
        )

        optimizer = optim.AdamW(
            model.parameters(),
            lr=CONFIG["training"]["learning_rate"],
            weight_decay=CONFIG["training"]["weight_decay"]
        )

        trainer = SLDTrainer(model, CONFIG, device)

        best_val_loss = float("inf")
        best_state = None

        for epoch in range(1, num_epochs + 1):
            train_loss = trainer.train_epoch(train_loader, optimizer, loss_fn)
            val_loss, val_probs, val_targets = trainer.validate_epoch(val_loader, loss_fn)

            from sklearn.metrics import roc_auc_score, f1_score
            try:
                val_auc = float(roc_auc_score(val_targets, val_probs, average="macro"))
            except Exception:
                val_auc = 0.5

            try:
                val_f1 = float(f1_score(val_targets, (val_probs >= 0.5).astype(int), average="macro"))
            except Exception:
                val_f1 = 0.0

            current_lr = float(optimizer.param_groups[0]["lr"])

            status_data["current_epoch"] = epoch
            status_data["progress_pct"] = round((epoch / num_epochs) * 100, 1)
            status_data["latest_metrics"] = {
                "train_loss": round(float(train_loss), 4),
                "val_loss": round(float(val_loss), 4),
                "val_auc": round(val_auc, 4),
                "val_f1": round(val_f1, 4),
                "learning_rate": current_lr
            }
            status_data["history"]["train_loss"].append(round(float(train_loss), 4))
            status_data["history"]["val_loss"].append(round(float(val_loss), 4))
            status_data["history"]["val_auc"].append(round(val_auc, 4))
            status_data["history"]["learning_rate"].append(current_lr)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = copy.deepcopy(model.state_dict())

            write_status(status_data)
            time.sleep(0.05)  # Yield execution briefly for responsive thread monitoring

        # Step 2: Optimal Threshold Calibration
        threshold_optimizer = YoudensJThresholdOptimizer(CONFIG)
        optimal_thresholds_dict = threshold_optimizer.fit(val_targets, val_probs)
        thresholds_list = [
            round(float(optimal_thresholds_dict.get(0, 0.5)), 4),
            round(float(optimal_thresholds_dict.get(1, 0.5)), 4),
            round(float(optimal_thresholds_dict.get(2, 0.5)), 4)
        ]

        # Step 3: Save Trained Checkpoint
        save_path = os.path.join(BASE_DIR, "ai", "best_model.pt")
        root_save_path = os.path.join(ROOT_DIR, "best_model.pt")
        if best_state is None:
            best_state = model.state_dict()

        checkpoint_payload = {
            "model_state_dict": best_state,
            "optimal_thresholds": thresholds_list,
            "config": CONFIG,
            "saved_at": datetime.now().isoformat()
        }

        torch.save(checkpoint_payload, save_path)
        try:
            torch.save(checkpoint_payload, root_save_path)
        except Exception:
            pass

        logger.info(f"[OK] Trained model checkpoint saved to: {save_path}")

        # Step 4: Reload inference engine singleton
        try:
            get_inference_engine().reload_checkpoint(save_path)
        except Exception as e:
            logger.error(f"Error reloading inference engine checkpoint: {e}")

        status_data["status"] = "completed"
        status_data["completion_time"] = datetime.now().isoformat()
        status_data["youdens_j_thresholds"] = thresholds_list
        status_data["final_metrics"] = {
            "macro_f1": status_data["latest_metrics"]["val_f1"],
            "macro_auc": status_data["latest_metrics"]["val_auc"],
            "val_loss": status_data["latest_metrics"]["val_loss"]
        }
        write_status(status_data)

    except Exception as e:
        logger.error(f"[TRAINING ERROR] {e}")
        err_status = read_status()
        err_status["status"] = "failed"
        err_status["error"] = str(e)
        err_status["failed_at"] = datetime.now().isoformat()
        write_status(err_status)

    finally:
        with TRAINING_LOCK:
            IS_TRAINING = False


@training_bp.route('/train', methods=['GET', 'POST'])
def train_status():
    global IS_TRAINING

    if request.method == 'POST':
        with TRAINING_LOCK:
            if IS_TRAINING:
                current_status = read_status()
                return jsonify({
                    "success": False,
                    "error": "Training job already in progress.",
                    "status": "conflict",
                    "current_progress": current_status
                }), 409

            IS_TRAINING = True

        req_data = request.get_json(silent=True) or {}
        num_epochs = req_data.get("epochs", 50)
        try:
            num_epochs = max(5, min(200, int(num_epochs)))
        except Exception:
            num_epochs = 50

        thread = threading.Thread(
            target=background_training_task,
            kwargs={"num_epochs": num_epochs},
            daemon=True
        )
        thread.start()

        return jsonify({
            "success": True,
            "message": "Background model training pipeline initiated successfully.",
            "status": "initiated",
            "epochs": num_epochs,
            "status_endpoint": "/api/train"
        }), 202

    # GET Request: Return current dynamic training metrics
    current_status = read_status()
    current_status["is_training_active"] = IS_TRAINING
    return jsonify(current_status), 200
