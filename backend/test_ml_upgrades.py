"""
================================================================================
COMPREHENSIVE TEST SUITE FOR ML RESEARCH ARCHITECTURE UPGRADES
SwarSetu Research Architecture - Priority 1 to 8 Verification
================================================================================
"""

import os
import sys
import tempfile
import unittest
import numpy as np
import torch
import torch.nn as nn

# Ensure path imports
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
for p in [ROOT_DIR, CURRENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from unified_predictor import (
    ResidualTransformerClassifier, FeatureAttention, LabelCorrelationLayer,
    DysgraphiaCNN, DysgraphiaFusionLayer, ReadingBiLSTM, ReadingFusionLayer,
    AsymmetricLoss, DiceLoss, CONFIG, set_all_seeds, SLDSyntheticDataGenerator
)
from ml_models.baselines import (
    LogisticRegressionBaseline, RandomForestBaseline, XGBoostBaseline,
    SimpleMLPBaseline, evaluate_model_performance
)
from ml_models.evaluate_baselines import run_baseline_comparison


class TestMLArchitectureUpgrades(unittest.TestCase):
    """Unit tests verifying all 8 priority ML upgrades."""

    @classmethod
    def setUpClass(cls):
        set_all_seeds(42)
        cls.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        cls.config = CONFIG.copy()

    # =========================================================================
    # PRIORITY 1: ATTENTION IMPLEMENTATION FIX
    # =========================================================================
    def test_01_attention_sequence_length_and_shape(self):
        """Verify attention operates on sequence length S > 1 with shape [B, H, S, S]."""
        attn_module = FeatureAttention(dim=256, num_heads=4).to(self.device)
        B, S, E = 8, 4, 256  # S = 4 semantic feature domain groups

        x = torch.randn(B, S, E).to(self.device)
        out, attn_weights = attn_module(x)

        self.assertGreater(S, 1, "Sequence length S must be > 1!")
        self.assertEqual(out.shape, (B, S, E))
        self.assertEqual(attn_weights.shape, (B, 4, S, S), "Attention matrix shape must be [B, H, S, S]!")

    def test_01_attention_weights_non_trivial(self):
        """Verify attention weights are not uniform or trivially 1.0."""
        attn_module = FeatureAttention(dim=256, num_heads=4).to(self.device)
        x = torch.randn(4, 4, 256).to(self.device)
        _, attn_weights = attn_module(x)

        # Non-trivial softmax attention weights should not all equal 0.25 (1/S) or 1.0
        max_weight = attn_weights.max().item()
        min_weight = attn_weights.min().item()
        self.assertNotAlmostEqual(max_weight, min_weight, places=4,
                                  msg="Attention weights should vary across key tokens!")

    def test_01_attention_inter_token_sensitivity_and_gradients(self):
        """Verify changing one token affects another token's representation and gradients flow."""
        attn_module = FeatureAttention(dim=256, num_heads=4).to(self.device)
        x1 = torch.randn(1, 4, 256, device=self.device, requires_grad=True)
        
        # Perturb token 1 (Math features)
        x2 = x1.clone()
        x2.data[0, 1, :] += 5.0

        out1, _ = attn_module(x1)
        out2, _ = attn_module(x2)

        # Output token 0 (Reading features) representation MUST change due to self-attention with token 1
        diff_token0 = (out1[0, 0, :] - out2[0, 0, :]).abs().sum().item()
        self.assertGreater(diff_token0, 1e-4, "Self-attention must model cross-token feature interactions!")

        # Gradient flow test
        loss = out1.sum()
        loss.backward()
        self.assertIsNotNone(x1.grad)
        self.assertTrue(torch.isfinite(x1.grad).all())

    # =========================================================================
    # PRIORITY 2: SIGMOID LABEL CORRELATION LAYER
    # =========================================================================
    def test_02_label_correlation_sigmoid_and_multi_label(self):
        """Verify label correlation uses sigmoid, outputs valid multi-label logits, and doesn't sum to 1."""
        layer = LabelCorrelationLayer(num_labels=3).to(self.device)
        raw_logits = torch.tensor([[1.0, -0.5, 0.8]], device=self.device, requires_grad=True)

        adj_logits = layer(raw_logits)
        probs = torch.sigmoid(adj_logits)

        # Outputs are valid multi-label probabilities in (0, 1)
        self.assertTrue((probs >= 0.0).all() and (probs <= 1.0).all())

        # Multi-label probabilities are NOT constrained to sum to 1
        prob_sum = probs.sum().item()
        self.assertNotAlmostEqual(prob_sum, 1.0, places=2,
                                  msg="Multi-label probabilities must NOT be forced to sum to 1!")

    def test_02_label_correlation_asymmetry_diagonal_and_gradients(self):
        """Verify asymmetric relationships, diagonal self-correlation C_ii=1, and gradient flow."""
        layer = LabelCorrelationLayer(num_labels=3).to(self.device)
        corr_matrix = layer.get_correlation_matrix()

        # Diagonal C_ii = 1.0
        for i in range(3):
            self.assertAlmostEqual(corr_matrix[i, i].item(), 1.0, places=4,
                                   msg="Self-correlation diagonal C_ii must equal 1.0!")

        # Asymmetric parameters C_01 != C_10
        self.assertNotEqual(corr_matrix[0, 1].item(), corr_matrix[1, 0].item(),
                             msg="Asymmetric comorbidity correlations must be supported!")

        # Learnable parameters receive gradients
        raw_logits = torch.randn(4, 3, device=self.device, requires_grad=True)
        out = layer(raw_logits)
        out.sum().backward()

        self.assertIsNotNone(layer.correlation_logits.grad)
        self.assertIsNotNone(layer.alpha.grad)
        self.assertTrue(torch.isfinite(layer.correlation_logits.grad).all())

    # =========================================================================
    # PRIORITY 3: BASELINE MODELS
    # =========================================================================
    def test_03_baseline_models_fit_and_predict(self):
        """Verify LR, RF, XGBoost, and Simple MLP baselines execute and predict multi-label outputs."""
        X_tr = np.random.randn(100, 64)
        y_tr = np.random.randint(0, 2, size=(100, 3))
        X_te = np.random.randn(20, 64)

        baselines = [
            LogisticRegressionBaseline(seed=42),
            RandomForestBaseline(seed=42),
            XGBoostBaseline(seed=42),
            SimpleMLPBaseline(seed=42),
        ]

        for model in baselines:
            model.fit(X_tr, y_tr)
            preds = model.predict(X_te)
            probs = model.predict_proba(X_te)

            self.assertEqual(preds.shape, (20, 3), f"{model.name} prediction shape mismatch!")
            self.assertEqual(probs.shape, (20, 3), f"{model.name} probability shape mismatch!")

    def test_03_baseline_evaluation_script(self):
        """Verify baseline evaluation script generates comparison table with synthetic disclosure."""
        table_output = run_baseline_comparison()
        self.assertIn("PIPELINE VALIDATION ON SYNTHETIC DATA — NOT REAL-WORLD PERFORMANCE", table_output)
        self.assertIn("Logistic Regression", table_output)
        self.assertIn("Random Forest", table_output)
        self.assertIn("Simple MLP", table_output)
        self.assertIn("SwarSetu Unified Model", table_output)

    # =========================================================================
    # PRIORITY 4: CNN FOR DYSGRAPHIA
    # =========================================================================
    def test_04_dysgraphia_cnn_forward_and_fusion(self):
        """Verify Dysgraphia CNN forward pass, image embedding, fusion, and gradient flow."""
        cnn = DysgraphiaCNN(in_channels=1, out_dim=64).to(self.device)
        fusion = DysgraphiaFusionLayer(img_dim=64, stroke_dim=16, fused_dim=16).to(self.device)

        img_tensor = torch.randn(4, 1, 64, 64, device=self.device, requires_grad=True)
        stroke_feat = torch.randn(4, 16, device=self.device, requires_grad=True)

        img_emb = cnn(img_tensor)
        self.assertEqual(img_emb.shape, (4, 64), "CNN image embedding shape must be [B, 64]!")

        fused_feat = fusion(img_emb, stroke_feat)
        self.assertEqual(fused_feat.shape, (4, 16), "Fused dysgraphia feature shape must be [B, 16]!")

        # Gradient flow
        fused_feat.sum().backward()
        self.assertIsNotNone(img_tensor.grad)
        self.assertTrue(torch.isfinite(img_tensor.grad).all())

    # =========================================================================
    # PRIORITY 5: BiLSTM FOR READING SEQUENCES
    # =========================================================================
    def test_05_reading_bilstm_forward_padding_and_fusion(self):
        """Verify BiLSTM reading sequence handling with variable padding, temporal embedding, and gradients."""
        bilstm = ReadingBiLSTM(input_dim=4, hidden_dim=64, num_layers=2, out_dim=64).to(self.device)
        fusion = ReadingFusionLayer(seq_emb_dim=64, agg_feat_dim=16, fused_dim=16).to(self.device)

        # Variable length reading sequences (batch=4, max_seq_len=20, feat_dim=4)
        seq_tensor = torch.randn(4, 20, 4, device=self.device, requires_grad=True)
        seq_lengths = torch.tensor([20, 15, 10, 5])
        agg_reading_feat = torch.randn(4, 16, device=self.device, requires_grad=True)

        seq_emb = bilstm(seq_tensor, seq_lengths)
        self.assertEqual(seq_emb.shape, (4, 64), "BiLSTM temporal embedding shape must be [B, 64]!")

        fused_feat = fusion(seq_emb, agg_reading_feat)
        self.assertEqual(fused_feat.shape, (4, 16), "Fused reading feature shape must be [B, 16]!")

        # Gradient flow
        fused_feat.sum().backward()
        self.assertIsNotNone(seq_tensor.grad)
        self.assertTrue(torch.isfinite(seq_tensor.grad).all())

    # =========================================================================
    # PRIORITY 6: ASL + DICE LOSS
    # =========================================================================
    def test_06_asymmetric_dice_loss_computation_and_lambdas(self):
        """Verify ASL + lambda * Dice Loss computation across lambda weights and detailed logging."""
        targets = torch.tensor([[1.0, 0.0, 1.0], [0.0, 1.0, 0.0]]).to(self.device)
        logits = torch.randn(2, 3, device=self.device, requires_grad=True)

        for lambda_weight in [0.0, 0.1, 0.25, 0.5]:
            loss_fn = AsymmetricLoss(dice_weight=lambda_weight).to(self.device)
            total_loss, asl_loss, dice_loss = loss_fn.forward_detailed(logits, targets)

            self.assertTrue(torch.isfinite(total_loss))
            self.assertGreaterEqual(total_loss.item(), 0.0)

            if lambda_weight > 0:
                expected_total = asl_loss + lambda_weight * dice_loss
                self.assertAlmostEqual(total_loss.item(), expected_total.item(), places=4)

        # Numerical stability with extreme probabilities (logits = -50 or +50)
        extreme_logits = torch.tensor([[-50.0, 50.0, -50.0]], device=self.device, requires_grad=True)
        extreme_targets = torch.tensor([[0.0, 1.0, 0.0]]).to(self.device)
        extreme_loss_fn = AsymmetricLoss(dice_weight=0.1).to(self.device)
        extreme_loss = extreme_loss_fn(extreme_logits, extreme_targets)
        self.assertTrue(torch.isfinite(extreme_loss), "Loss must remain numerically stable at extreme logits!")

    # =========================================================================
    # PRIORITY 7: 256-D EMBEDDING UPGRADE
    # =========================================================================
    def test_07_embedding_dimension_256(self):
        """Verify model intermediate representations use 256-D embedding size throughout."""
        model = ResidualTransformerClassifier(self.config).to(self.device)
        self.assertEqual(model.embedding_dim, 256, "Model embedding_dim must equal 256!")

        x_tab = torch.randn(4, 64).to(self.device)
        tokens = model._tokenize_features(x_tab)
        self.assertEqual(tokens.shape, (4, 4, 256), "Feature group tokens must have dimension 256!")

    # =========================================================================
    # PRIORITY 8 & INFRASTRUCTURE: MULTIMODAL UNIFICATION & CHECKPOINTS
    # =========================================================================
    def test_08_multimodal_end_to_end_forward_pass(self):
        """Verify end-to-end forward pass with tabular, canvas image, and reading sequence inputs."""
        model = ResidualTransformerClassifier(self.config).to(self.device)
        x_tab = torch.randn(4, 64).to(self.device)
        x_img = torch.randn(4, 1, 64, 64).to(self.device)
        x_seq = torch.randn(4, 15, 4).to(self.device)
        seq_lens = torch.tensor([15, 12, 10, 8])

        # Forward pass with tabular-only
        logits_tab = model(x_tab)
        self.assertEqual(logits_tab.shape, (4, 3))

        # Forward pass with full multimodal inputs
        logits_multi, attn = model(x_tab, x_image=x_img, x_sequence=x_seq,
                                   seq_lengths=seq_lens, return_attention_weights=True)
        self.assertEqual(logits_multi.shape, (4, 3))
        self.assertEqual(attn.shape, (4, 4, 4, 4))

        # MC Dropout prediction
        mean_pred, uncert = model.mc_predict(x_tab, x_image=x_img, x_sequence=x_seq, n_samples=5)
        self.assertEqual(mean_pred.shape, (4, 3))
        self.assertEqual(uncert.shape, (4, 3))

    def test_09_checkpoint_save_and_load_compatibility(self):
        """Verify 256-D model state dict can be saved and reloaded cleanly."""
        model1 = ResidualTransformerClassifier(self.config).to(self.device)
        model1.eval()
        x = torch.randn(2, 64).to(self.device)
        with torch.no_grad():
            out1 = model1(x)

        with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            ckpt_data = {
                "model_state_dict": model1.state_dict(),
                "config": self.config,
                "optimal_thresholds": [0.5, 0.5, 0.5]
            }
            torch.save(ckpt_data, tmp_path)

            # Load into fresh instance
            model2 = ResidualTransformerClassifier(self.config).to(self.device)
            loaded_data = torch.load(tmp_path, map_location=self.device)
            model2.load_state_dict(loaded_data["model_state_dict"])
            model2.eval()

            with torch.no_grad():
                out2 = model2(x)

            diff = (out1 - out2).abs().sum().item()
            self.assertAlmostEqual(diff, 0.0, places=4,
                                   msg="Reloaded checkpoint must yield identical predictions!")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


if __name__ == "__main__":
    unittest.main()


def test_dyscalculia_reads_fields_the_dsm5_test_sends():
    """The frontend sends estimation_accuracy / procedural_accuracy; both must reach the model."""
    from ai.feature_extractors import DyscalculiaFeatureExtractor
    names = DyscalculiaFeatureExtractor.FEATURE_NAMES
    payload = {"games": {"arithmetic": {"accuracy": 0.9, "estimation_accuracy": 0.2, "procedural_accuracy": 0.1}}}
    f = DyscalculiaFeatureExtractor().extract(payload)
    assert abs(f[names.index("estimation_accuracy")] - 0.2) < 1e-6
    assert abs(f[12] - 0.1) < 1e-6  # procedural feature, previously replaced by overall accuracy (0.9)
