import sys
import numpy as np
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, ".")
from unified_predictor import (
    SLDSyntheticDataGenerator, CONFIG, ResidualTransformerClassifier,
    SLDDataset, AsymmetricLoss, set_all_seeds,
)
from ml_models.baselines import evaluate_model_performance

set_all_seeds(42)
gen = SLDSyntheticDataGenerator(CONFIG, seed=42)
X, y, _ = gen.generate()
n_train, n_val = 800, 200
X_train, y_train = X[:n_train], y[:n_train]
X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
X_test, y_test = X[n_train + n_val:], y[n_train + n_val:]

train_ds = SLDDataset(X_train, y_train, scaler=None, is_train=True)
val_ds = SLDDataset(X_val, y_val, scaler=train_ds.scaler)
test_ds = SLDDataset(X_test, y_test, scaler=train_ds.scaler)

train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
val_loader = DataLoader(val_ds, batch_size=64, shuffle=False)

device = torch.device("cpu")
model = ResidualTransformerClassifier(CONFIG).to(device)
loss_fn = AsymmetricLoss(gamma_pos=0.0, gamma_neg=4.0, dice_weight=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)

print("Training 50 epochs...")
for epoch in range(1, 51):
    model.train()
    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.float().to(device)
        optimizer.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward()
        optimizer.step()

    if epoch % 10 == 0:
        model.eval()
        probs_list, targets_list = [], []
        with torch.no_grad():
            for xb, yb in val_loader:
                probs_list.append(torch.sigmoid(model(xb.to(device))).numpy())
                targets_list.append(yb.numpy())
        vp = np.vstack(probs_list)
        vt = np.vstack(targets_list)
        m = evaluate_model_performance(vt, vp, (vp >= 0.5).astype(int))
        print(f"Epoch {epoch}: val AUC={m['Macro ROC-AUC']:.4f} F1={m['Macro F1']:.4f}")

model.eval()
with torch.no_grad():
    probs = torch.sigmoid(model(torch.FloatTensor(test_ds.X))).numpy()
m = evaluate_model_performance(y_test, probs, (probs >= 0.5).astype(int))
print(f"TEST AUC={m['Macro ROC-AUC']:.4f} F1={m['Macro F1']:.4f}")
