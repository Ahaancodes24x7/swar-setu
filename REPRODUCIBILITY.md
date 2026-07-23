# SwarSetu Software & Experiment Reproducibility Guide

**Date**: July 22, 2026  
**Status**: 100% Reproducible Environment  

---

## 1. Software Specifications

- **Python Version**: 3.10.x / 3.11.x
- **Node.js Version**: v20.x
- **PyTorch Version**: 2.12.0 (CPU / CUDA compatible)
- **Vite Version**: 5.4.19
- **Random Seed**: `42` (Enforced across PyTorch, NumPy, and Python `random` in `set_all_seeds(42)`)

---

## 2. Reproduction Commands

### Model Training & Verification
```bash
# Train PyTorch FT-Transformer model & generate validation metrics
python unified_predictor.py
```

### Backend Server & Integration Tests
```bash
# Test all backend REST endpoints
python backend/test_backend.py

# Test ML Feature Engineering pipeline
python backend/test_ml_pipeline.py

# Test Unified 3-Assessment Gating logic
python backend/test_unified_gating.py

# Run backend Flask server locally
python backend/app.py
```

### Frontend Build
```bash
# Build Vite production frontend bundle
cd frontend
npm install
npm run build
```
