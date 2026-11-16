# SwarSetu ML Research Architecture Upgrades

## Overview

This document describes the architectural upgrades implemented in the SwarSetu PyTorch research pipeline (`unified_predictor.py`) and associated backend ML modules (`backend/ml_models/baselines.py`, `backend/ml_models/evaluate_baselines.py`, `backend/test_ml_upgrades.py`).

These upgrades enhance feature attention, label correlation mathematics, baseline comparisons, multi-modal image and sequence pathways, loss formulations, and embedding dimensions, while preserving existing residual blocks, MC Dropout uncertainty, threshold calibration, and production Flask separation.

---

## 1. Existing Functionality Preserved

- **Residual Blocks**: 4 residual blocks with LayerNorm, GELU activation, dropout, and skip connections (`ResidualBlock`).
- **Asymmetric Loss Foundation**: Asymmetric focal penalty for multi-label screening bias (`AsymmetricLoss`).
- **Uncertainty Quantification**: Monte Carlo Dropout inference engine (`mc_predict`).
- **Threshold Optimization**: Youden's J statistic threshold calibration per disorder (`YoudensJThresholdOptimizer`).
- **Synthetic Data Generation**: Realistic 64-feature data generator with prevalence and comorbidity controls (`SLDSyntheticDataGenerator`).
- **Production Predictor Separation**: Flask production routes continue using deterministic NumPy predictors (`dyslexia_nn_model.py`, `dyscalculia_nn_model.py`, `dysgraphia_nn_model.py`).

---

## 2. Implemented Upgrades

### Priority 1: Multi-Token Feature Attention Fix
- **Problem**: The previous model unsqueezed feature embeddings to sequence length 1 (`[B, 1, 128]`), rendering self-attention mathematically trivial with a `[1 x 1]` attention matrix and constant softmax weights of 1.0.
- **Solution**: Replaced sequence-1 unsqueezing with semantic tokenization. The 64 input features are partitioned into $S = 4$ semantic domain feature tokens (`[B, 4, 256]`):
  1. Reading / Phonological features (indices 0..15)
  2. Math / Processing Speed features (indices 16..31)
  3. Motor / Writing features (indices 32..47)
  4. Behavioral / Executive Function features (indices 48..63)
- **Attention Matrix**: Multi-head self-attention produces an attention matrix of shape `[B, H, S, S]` (where $S=4, H=4$), modeling true inter-token feature domain interactions.
- **Assertions & Debugging**: Explicit shape assertions (`assert attn.shape == (B, H, S, S)`) and `inspect_attention(x)` method added to extract attention maps.
- **Verification**: Unit tests verify $S > 1$, non-trivial attention weights, inter-token sensitivity, gradient flow, and inference usage.

### Priority 2: Sigmoid Label Correlation Layer Fix
- **Problem**: The previous implementation applied `torch.softmax(self.correlation, dim=-1)`, which forced label correlation rows to sum to 1 like mutually exclusive single-label probabilities.
- **Solution**: Implemented a mathematically appropriate sigmoid formulation:
  $$C_{ij} = \text{sigmoid}(A_{ij})$$
  where $A_{ij}$ is initialized from log-odds of clinical comorbidity priors:
  $$A_{ij} = \text{logit}(P_{ij}) = \ln\left(\frac{P_{ij}}{1 - P_{ij}}\right)$$
- **Properties**:
  1. **Multi-label compatible**: Probabilities are not constrained to sum to 1.
  2. **Asymmetric relationships**: $C_{ij} \neq C_{ji}$ is natively supported.
  3. **Explicit diagonal**: Self-correlation $C_{ii} = 1.0$ is strictly preserved via identity masking.
  4. **Learnable parameters**: Matrix $A$ and scaling factor $\alpha$ receive backpropagation gradients.

### Priority 3: Classical Baseline Models Module
- **Modules Created**: `backend/ml_models/baselines.py` and `backend/ml_models/evaluate_baselines.py`.
- **Models**:
  1. Logistic Regression (`LogisticRegressionBaseline`)
  2. Random Forest (`RandomForestBaseline`)
  3. XGBoost Classifier (`XGBoostBaseline` with GradientBoosting fallback)
  4. Simple MLP Classifier (`SimpleMLPBaseline`)
- **Evaluation Metrics**: Accuracy, Precision, Recall, F1, Macro F1, Weighted F1, ROC-AUC, PR-AUC, Confusion matrices.
- **Comparison Table**: Includes `ResidualTransformerClassifier` and outputs a comparison table clearly marked with:
  `"PIPELINE VALIDATION ON SYNTHETIC DATA — NOT REAL-WORLD PERFORMANCE"`.

### Priority 4: Dysgraphia CNN Pathway
- **Modules**: `DysgraphiaCNN` and `DysgraphiaFusionLayer`.
- **Architecture**:
  - Input: Canvas handwriting image tensor `[B, 1, 64, 64]`.
  - Layers: Conv2d $\rightarrow$ GroupNorm $\rightarrow$ GELU $\rightarrow$ MaxPool2d $\rightarrow$ Conv2d $\rightarrow$ GroupNorm $\rightarrow$ GELU $\rightarrow$ MaxPool2d $\rightarrow$ Conv2d $\rightarrow$ AdaptiveAvgPool2d $\rightarrow$ Linear projection to 64-D image embedding.
- **Fusion**: Fuses 64-D image embedding with engineered 16-D stroke features into 16-D dysgraphia group features.

### Priority 5: Reading BiLSTM Pathway
- **Modules**: `ReadingBiLSTM` and `ReadingFusionLayer`.
- **Architecture**:
  - Input: Sequential reading data `[B, T, D_seq]` and sequence lengths.
  - Layers: 2-layer Bidirectional LSTM with `pack_padded_sequence` padding support $\rightarrow$ Mean + Max temporal pooling $\rightarrow$ Linear projection to 64-D sequence embedding.
- **Fusion**: Fuses 64-D sequence embedding with 16-D aggregate reading features into 16-D dyslexia group features.

### Priority 6: Dice Loss Extension to ASL
- **Module**: `DiceLoss` and `AsymmetricLoss` (with combined loss).
- **Formulation**:
  $$\text{Total Loss} = \text{ASL} + \lambda \times \text{DiceLoss}$$
  $$\text{DiceLoss} = 1 - \frac{2 \sum p_i y_i + \epsilon}{\sum p_i^2 + \sum y_i^2 + \epsilon}$$
- **Logging & Configurations**: `forward_detailed` logs total loss, ASL component, and Dice component across $\lambda \in \{0.0, 0.1, 0.25, 0.5\}$.

### Priority 7: 256-D Embedding Upgrade
- **Dimension**: Upgraded `embedding_dim` from 128 to 256 across `CONFIG`, linear group projections, residual blocks, attention heads, and output heads.

### Priority 8: Multimodal Architecture Unification
- **Integration**: `ResidualTransformerClassifier` fuses tabular feature tokens ($S=4$), canvas CNN, and reading BiLSTM into a unified forward pass with tabular-only fallback support when optional modalities are `None`.
- **Versioning**: Artifact version string `"3.0 - Multimodal FT-Transformer"`.

---

## 3. Data & Research Integrity Disclosure

> [!IMPORTANT]
> **Synthetic Data Limitation Notice**:
> The repository currently contains synthetic data for pipeline validation. Synthetic experiments demonstrate model shape correctness, tensor gradient flow, loss convergence, and comparative pipeline interfaces. **Synthetic performance must NEVER be presented as evidence of clinical or educational diagnostic effectiveness.** Real-world validation requires clinical datasets, ethical approvals, and expert-labeled diagnostic standards.

---

## 4. Verification Suite Results

| Test Category | Command | Status | Description |
|---|---|---|---|
| ML Upgrades Suite | `python -m unittest backend/test_ml_upgrades.py` | **PASS** (13/13) | Verified S > 1 attention, shape `[B, H, S, S]`, non-trivial weights, inter-token sensitivity, sigmoid label correlation, baselines, CNN, BiLSTM, Dice loss, 256-D embedding, and checkpoint compatibility. |
| Full Backend Suite | `python -m unittest discover -s backend` | **PASS** (23/23) | Verified all backend AI services, calibration, conformal prediction intervals, SHAP explanations, verification suite, and ML pipeline routes. |
