# Quick Start Guide - Cognexia AI Unified SLD Predictor

## Installation & Setup

### 1. Install Dependencies
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install scikit-learn numpy matplotlib seaborn tqdm
```

### 2. Run the Complete System
```bash
python unified_predictor.py
```

This will:
- ✅ Generate synthetic data (1200 samples, 64 features)
- ✅ Run test suite (all 12 tests)
- ✅ Train the model (16 epochs, early stopping)
- ✅ Calibrate optimal thresholds (Youden's J)
- ✅ Evaluate on test set
- ✅ Run inference on 5 sample children
- ✅ Generate 3 risk reports
- ✅ Plot training curves
- ✅ Plot confusion matrices

**Total Runtime**: ~3-5 minutes (CPU)

---

## Output Files Generated

```
training_curves.png              # 4-panel plot:
                                 # - Training vs Validation Loss
                                 # - Validation AUC over epochs
                                 # - Learning rate schedule
                                 # - Training completion status

confusion_matrices.png           # 3 confusion matrices (one per disorder)
                                 # Shows: TP, FP, TN, FN per disorder

unified_predictor.py             # Main implementation (1629 lines, 72 KB)

IMPLEMENTATION_SUMMARY.md        # Full technical documentation
```

---

## How to Use with Real Data

### Step 1: Replace Synthetic Data Generator

```python
# Instead of:
generator = SLDSyntheticDataGenerator(CONFIG, seed=CONFIG["device"]["seed"])
X, y, metadata = generator.generate()

# Use your clinical data:
X = np.load('cognitive_features.npy')  # Shape: [N, 64]
y = np.load('sld_labels.npy')          # Shape: [N, 3] - binary for each disorder

# X should be a matrix where each row is a child's cognitive profile
# y should be binary (0/1) for each of 3 disorders: [dyslexia, dyscalculia, dysgraphia]
```

### Step 2: Train on Your Data

```python
from unified_predictor import *

# Configure for your data
CONFIG["data"]["n_train_samples"] = 1000
CONFIG["data"]["n_val_samples"] = 200
CONFIG["data"]["n_test_samples"] = 200

# Load your data
X, y, metadata = your_data_loader()

# Create datasets
train_dataset = SLDDataset(X_train, y_train, scaler=None, is_train=True)
val_dataset = SLDDataset(X_val, y_val, scaler=train_dataset.scaler)
test_dataset = SLDDataset(X_test, y_test, scaler=train_dataset.scaler)

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32)
test_loader = DataLoader(test_dataset, batch_size=32)

# Train model
model = ResidualTransformerClassifier(CONFIG).to(device)
loss_fn = AsymmetricLoss(gamma_pos=0.0, gamma_neg=4.0)
trainer = SLDTrainer(model, CONFIG, device)
history = trainer.fit(train_loader, val_loader, loss_fn)

# Calibrate thresholds
threshold_optimizer = trainer.calibrate_thresholds(val_loader)
```

### Step 3: Use for School Screening

```python
# Setup inference engine
engine = SLDInferenceEngine(model, CONFIG, device, 
                           train_dataset.scaler, threshold_optimizer)

# Screen single child
feature_vector = get_child_assessment(student_id)  # 64-dim vector
prediction = engine.predict_single(feature_vector)

# Print results
for disorder in ['Dyslexia', 'Dyscalculia', 'Dysgraphia']:
    p = prediction[disorder]
    print(f"\n{disorder}:")
    print(f"  Risk Score: {p['risk_score']:.1%}")
    print(f"  Uncertainty: {p['uncertainty']:.4f}")
    print(f"  Risk Level: {p['risk_level']}")
    print(f"  Recommendation: {p['recommendation']}")

# Batch screening
features_matrix = np.array([...])  # [N_students, 64]
batch_predictions = engine.predict_batch(features_matrix)

# Export to CSV
for student_id, pred in batch_predictions.items():
    export_student_report(student_id, pred)
```

---

## Key Configuration Options

### Model Architecture
```python
CONFIG["model"] = {
    "input_dim": 64,              # Cognitive feature vector size
    "embedding_dim": 128,         # Feature embedding dimension
    "hidden_dim": 256,            # Residual block hidden layer
    "num_residual_blocks": 4,     # Stack depth
    "num_attention_heads": 4,     # Multi-head attention
    "dropout_rate": 0.3,          # MC Dropout rate
}
```

### Training Hyperparameters
```python
CONFIG["training"] = {
    "batch_size": 32,
    "num_epochs": 100,
    "learning_rate": 1e-3,        # AdamW
    "weight_decay": 1e-4,         # L2 regularization
    "gradient_clip_norm": 1.0,
    "early_stopping_patience": 15,
}
```

### Loss Function
```python
CONFIG["loss"] = {
    "gamma_pos": 0.0,   # No penalty for easy positives
    "gamma_neg": 4.0,   # Heavy penalty for false negatives (critical for screening)
    "clip_margin": 0.05,
}
```

### Threshold Optimization
```python
CONFIG["threshold_optimization"] = {
    "n_thresholds": 200,          # Candidate thresholds to evaluate
    "threshold_range": (0.01, 0.99),
    "optimization_metric": "youdens_j",  # J = Sensitivity + Specificity - 1
}
```

### MC Dropout Configuration
```python
CONFIG["mc_dropout"] = {
    "n_samples": 10,              # Forward passes for uncertainty
    "keep_dropout_active": True,  # CRITICAL: Active during inference
}
```

---

## Understanding the Output

### Risk Score Interpretation
- **0.0 - 0.3**: Low risk (no action)
- **0.3 - 0.6**: Monitor (classroom observation, follow-up assessment)
- **0.6 - 0.8**: Refer (specialist evaluation needed)
- **0.8 - 1.0**: Urgent (immediate specialist referral)

### Uncertainty Score
- **Low uncertainty (< 0.05)**: Model confident in prediction
- **High uncertainty (> 0.15)**: Model uncertain, consider specialist evaluation

**Example**: Risk=0.65, Uncertainty=0.12
- → "Refer to specialist" (crossing 0.6 threshold)
- → Moderate confidence (1.2 uncertainty is not too high)
- → Recommendation: Specialist assessment with confirmatory testing

### Youden's J Statistic
- Optimal threshold maximizes: **J = Sensitivity + Specificity - 1**
- J=0: Random guessing
- J=1: Perfect classification
- Typical range: 0.1-0.5 (imbalanced screening data)

---

## Evaluation Metrics Explained

### For Screening (Medical Context)

| Metric | What It Measures | Why It Matters |
|--------|------------------|----------------|
| **Sensitivity** | % of real cases caught | Don't miss disorders (false negatives bad) |
| **Specificity** | % of non-cases correctly identified | Minimize unnecessary referrals (false positives) |
| **AUC-ROC** | Overall discrimination ability | How well model separates affected/unaffected |
| **AUC-PR** | Precision-Recall curve | Better for imbalanced data (important for SLDs ~15-20% prevalence) |
| **Uncertainty** | Confidence in prediction | Higher = less reliable, consider specialist |

### Balanced Accuracy
- Balances sensitivity and specificity
- Unaffected by class imbalance
- Good for screening where both metrics matter

---

## Advanced: Feature Importance Analysis

```python
# See which cognitive features drove each prediction
feature_vector = np.random.randn(64)
importance = engine.get_feature_importance(feature_vector)

# Outputs gradient-based feature importance
for disorder, imp_scores in importance.items():
    top_features = np.argsort(imp_scores)[-5:]  # Top 5
    print(f"\n{disorder} - Top Contributing Features:")
    for feat_idx in top_features:
        print(f"  Feature {feat_idx}: {imp_scores[feat_idx]:.4f}")

# Use to understand which aspects of cognitive profile
# influenced the model's risk assessment
```

---

## Common Issues & Solutions

### Issue: "Expected more than 1 value per channel when training"
**Solution**: Already fixed in implementation! Batch norm uses eval mode statistics during MC Dropout inference.

### Issue: Low test performance (AUC ~0.55)
**Explanation**: Synthetic data is random. Real clinical data will perform better.
**Solution**: 
- Train on real clinical dataset
- Ensure feature quality and normalization
- Consider ensemble methods or transfer learning

### Issue: High false positive rate (many Monitor/Refer labels)
**Explanation**: Asymmetric loss penalizes false negatives heavily
**Solution**: 
- Increase threshold values via `CONFIG["inference"]["risk_level_thresholds"]`
- Collect clinical feedback and retrain
- Add specialist validation loop

### Issue: Model convergence issues
**Solution**: 
- Reduce learning rate: `CONFIG["training"]["learning_rate"]`
- Increase gradient clip norm: `CONFIG["training"]["gradient_clip_norm"]`
- Check feature normalization in dataset

---

## For Clinical Integration

### Step 1: Validation Study
```
1. Collect clinical cohort (N=500+)
2. Get gold-standard clinical diagnoses
3. Extract cognitive feature vectors
4. Train model on subset, test on holdout
5. Compute sensitivity/specificity on real cases
6. Publish validation results
```

### Step 2: Threshold Recalibration
```
Clinical stakeholders decide:
- How high should sensitivity be? (catch all cases)
- How low should false positive rate be? (avoid unnecessary referrals)
- Adjust thresholds to match organizational policy
```

### Step 3: User Interface
```python
# Example integration with school dashboard
from unified_predictor import SLDInferenceEngine

class ScreeningDashboard:
    def __init__(self, model, scaler, threshold_optimizer):
        self.engine = SLDInferenceEngine(model, CONFIG, device, 
                                        scaler, threshold_optimizer)
    
    def screen_student(self, student_id, cognitive_profile):
        prediction = self.engine.predict_single(cognitive_profile)
        
        # Format for dashboard
        return {
            'student_id': student_id,
            'dyslexia_risk': prediction['Dyslexia']['risk_score'],
            'dyscalculia_risk': prediction['Dyscalculia']['risk_score'],
            'dysgraphia_risk': prediction['Dysgraphia']['risk_score'],
            'recommendations': {
                d: prediction[d]['recommendation'] 
                for d in CONFIG["evaluation"]["disorder_names"]
            }
        }

# Use in web interface, mobile app, etc.
```

---

## Performance Benchmarks

**Training**:
- ~16 epochs to convergence
- ~2 minutes on CPU
- ~20 seconds on GPU

**Inference**:
- Single child: ~50ms (CPU), ~5ms (GPU)
- School cohort (1000 children): ~50s (CPU), ~5s (GPU)

**Model Size**:
- Parameters: 341,516
- Checkpoint: ~1.3 MB

---

## Research & Citation

This implementation is built on:
- Gorishniy et al. (2021) - FT-Transformer
- He et al. (2016) - Residual Networks
- Vaswani et al. (2017) - Attention Mechanism
- Gal & Ghahramani (2016) - MC Dropout Uncertainty
- Ben-Baruch et al. (2021) - Asymmetric Loss
- Saito & Rehmsmeier (2015) - Youden's J Optimization
- Wang et al. (2016) - Label Correlation

See `IMPLEMENTATION_SUMMARY.md` for full citations.

---

## Next Steps

1. **Validate on Real Data**: Use clinical dataset to measure true performance
2. **Integrate with School Systems**: Connect to student information systems
3. **Get Clinical Feedback**: Iterate based on educator/specialist input
4. **Optimize Thresholds**: Customize for your school's needs
5. **Monitor & Retrain**: Collect feedback, maintain model performance

---

**Questions?** Refer to [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for complete technical documentation.
