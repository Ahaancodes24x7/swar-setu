# SwarSetu — Technical Explainer

*Notes for explaining the system and paper to the professors and the conference panel. Every number here matches the paper (`paper/SwarSetu_Paper.ipynb`) and the result files in `backend/reports/realistic_eval/results/`.*

---

## 0. The one-paragraph version

SwarSetu screens a child for **dyslexia, dyscalculia and dysgraphia in one tablet session**: reading, maths and handwriting tasks. The tasks produce 64 features. These are **normed for age, home language and input device**, then scored by **one LightGBM classifier per disorder**. Each score is mapped to a referral tier using thresholds fixed in advance, and a **class-conditional conformal set** says when the model is unsure. A teacher questionnaire adds the DSM-5 criteria that tests cannot observe. The research contribution has two parts. First, we found that our own earlier evaluation was **misleadingly easy**: it reported AUROC 0.97. We rebuilt it realistically, and a fancy transformer turned out to be no better than logistic regression. What actually works is **measuring the child correctly**: norming, missing-data handling, calibration, and device-invariant handwriting. Second, an **audit of the deployed system** found 17 defects that together meant it flagged *no child at all*.

---

## 1. System architecture

```
 Tablet/phone (React + TypeScript + Vite + Tailwind)
   ├─ Reading tasks  + oral reading fluency (mic → Whisper)
   ├─ Maths tasks    + 1-minute number facts
   ├─ Handwriting    copying / dictation / sentence / composition (pointer events)
   └─ Behaviour telemetry (attention, persistence, impulsivity)
            │  JSON payload: task telemetry + student covariates
            ▼
 Flask backend (Python)  ── routes/assessment.py  (/assess, /predict, /unified-profile, /assessments/<id>/outcome)
   ├─ ai/speech.py        self-hosted Whisper (large-v3-turbo GPU / small CPU)
   ├─ handwriting route   self-hosted TrOCR legibility
   ├─ feature extractors  → 64 features in [0,1], higher = better
   └─ screening/
        ├─ synthetic_cohort.py   realistic cohort generator (liability-threshold model)
        ├─ model.py              Normer + LightGBM training + bundle save/load (SHA-256)
        ├─ engine.py             ScreeningEngine: loads bundle, predicts, tiers, conformal sets
        ├─ metrics.py            ECE, threshold_for_sensitivity, Mondrian quantiles, conformal_set
        └─ dsm5.py               questionnaire schema, validation, Criterion D flags, criteria summary
            ▼
 Supabase / PostgreSQL: students, DSM-5 profiles (with history), every assessment +
 feature vector + prediction + model version + later confirmed diagnosis (for re-training)
            ▼
 Teacher / parent dashboards, PDF report, Gemini-based plain-language explainer (no child names sent)
```

**Design principle:** the model is only one component. The parts that matter most are *upstream* (what is measured, and how it is normed) and *downstream* (thresholds, uncertainty, DSM-5 logic).

---

## 1b. Screening protocol: all three DSM-5 tests, every time

- **Default:** every session runs the **reading → math → writing** DSM-5 tests. The three are merged and scored together by the comprehensive model (`POST /api/unified-profile`, 64 features). The teacher sees a "2 of 3 tests done" progress bar with a break between tests, and one combined result at the end.
- **Why:** 25–50% of affected children have more than one disorder. A reading-only screen would miss a child's co-occurring dyscalculia.
- **Single test only with teacher permission:** the teacher must pick a reason (follow-up re-screen, child couldn't finish, specialist request, other + note) and tick "I permit…". The reason, teacher ID and session ID are saved in the session's `analysis_report.screening_protocol`. The result then comes from the single-test model for that domain.
- **Enforced in code:**
  - The backend returns HTTP 400 with the missing tests if the battery is incomplete.
  - `buildUnifiedRequest()` throws on a partial battery (unit-tested in `frontend/src/test/screeningBattery.test.ts`).
  - Leaving mid-battery warns that no combined result will be produced.
- Code: [screeningBattery.ts](../frontend/src/lib/screeningBattery.ts), [SingleTestPermissionDialog.tsx](../frontend/src/components/dashboard/SingleTestPermissionDialog.tsx), [TeacherDashboard.tsx](../frontend/src/pages/dashboard/TeacherDashboard.tsx).

---

## 2. Features (64 = 4 blocks × 16)

| Block | Examples | Notes |
|---|---|---|
| Reading (dyslexia) | reading speed vs age norm, accuracy, phoneme errors, letter confusions, pseudoword decoding, rapid automatised naming, phonological awareness, comprehension, WCPM | WCPM comes from aligning the Whisper transcript to the passage |
| Maths (dyscalculia) | subitising, magnitude comparison speed, fact retrieval, number line, place value, multi-step accuracy, word problems | number-facts task gives facts/min and time per fact |
| Handwriting (dysgraphia) | legibility (TrOCR), fluency, jitter index, halts, pauses, baseline slope/scatter | all device-invariant (Section 6) |
| Behaviour | attention, persistence, impulse control, frustration tolerance | secondary effects, present for any disorder |

All features are in [0, 1] with **higher = better**. If a module is skipped, the extractor fills in a default (0.5 or 0.7). The model also receives a **missing-indicator** for every feature, so it knows "default because missing" apart from "a genuinely average score".

---

## 3. Why the old benchmark was wrong (the core story)

**Old generator:** it subtracted a constant from all 16 features of a disorder's block, then min–max normalised.
- The documented effect size was 0.6, but it was applied where the noise SD was 0.3, so **Cohen's d ≈ 1.5–1.6 per feature**. That is huge: real reading-skill effect sizes are moderate.
- Prevalence came out at 16–21% instead of the stated 15%.
- **Logistic regression got AUROC 0.96–0.97.** When the simplest baseline is near-perfect, the benchmark cannot tell good models from bad.

**New generator (liability-threshold model):**

1. Each child has 5 correlated latent abilities: R (reading/phonology), M (number sense), W (graphomotor), E (executive attention), S (processing speed). For example, ρ(R, M) = 0.55.
2. Disorder k is present if its liability falls below the prevalence quantile:
   `ℓ_k = r·z̃_k + √(1−r²)·ε_k`, `y_k = 1[ℓ_k < Φ⁻¹(π_k)]`, with r = 0.9 (diagnostic reliability) and π = (8%, 6%, 7%).
3. **Comorbidity emerges** from the correlated latents; it is not hard-coded. P(dyscalculia | dyslexia) = 0.22, which is within the published ranges.
4. Features = noisy combinations of latents (loadings 0.15–0.75), with cross-loadings. Median d ≈ 0.8.
5. Realistic nuisance factors:
   - **Age**: skills rise 0.25 SD per year (ages 7–13).
   - **Home language**: 60% are Hindi-dominant and score 0.35 SD lower on English phonology without having any disorder.
   - **Device**: 70% use a finger, so there is no pressure signal and the data are noisier.
   - **Measurement**: binomial item scores, a reading-speed ceiling, 8% missing items, 10% skipped modules.
   - **Imperfect labels**: 10% of true cases are labelled negative and 1% of typical children positive.
6. **External site B** shifts everything: younger children, 85% Hindi-dominant, 95% finger input, more noise, and 25% higher prevalence.

**Key fact for questions:** an *oracle* that knows the true latent abilities reaches only AUROC ~0.90, because the labels are noisy. So **0.86 is close to the realistic ceiling**, not a weak result.

---

## 4. The production pipeline

### 4.1 Norming (the single most important step)
Psychologists score tests against **age norms**; we do the same statistically.
- On *typically developing* training children, regress each feature on c = (age, age², Hindi-dominant, finger-input).
- Give the model the standardised residual `z_j = (x_j − β̂ⱼᵀc) / σ̂_j`.
- Plain-language meaning: "How does this child compare with typical children of the *same age, language and device*?"
- If a covariate is unknown, impute the training mean. During training, 15% of covariates are randomly masked so the model learns to cope with that case.

**Evidence that this matters:**
- Without covariates, the pipeline drops from **0.858 to 0.803**, which is the same level as the unadjusted models.
- In the sensitivity analysis, if age has *no* effect, all models converge to 0.84–0.85. So **norming, not LightGBM itself, is the main source of the gain.** Say this honestly; it is a strength of the paper.

### 4.2 Model
- One **LightGBM** binary classifier per disorder: 300 trees, 7 leaves, learning rate 0.03, subsample 0.8, colsample 0.7, min_child_samples 30. Kept deliberately small, which suits small data.
- Inputs: 64 normed features + 64 missing indicators (+ 6 optional questionnaire items; LightGBM handles NaN natively).
- **Comprehensive mode** uses all 64 features. **Single-test mode** uses one 16-feature block, so a teacher can run only the reading test (AUROC 0.848–0.855, vs 0.854–0.860 comprehensive).
- **Loss / training (the same for all three disorders):**
  - Each child has 3 labels (dyslexia, dyscalculia, dysgraphia). Every child trains all three models, so a comorbid child is a positive for several of them.
  - Each booster minimises **regularised binary log-loss**, `L_k = −mean[y log p + (1−y) log(1−p)] + λ‖w‖²`, with λ = 1.
  - All three models share the normer, the features and the splits, which are stratified on the 8 label combinations.
  - Every metric is computed **per disorder** and then macro-averaged.
  - Validation log-loss bottoms out at 129 / 142 / 184 trees and is flat to 300, so there is no harmful overfitting (paper Fig. 2).
- **Why LightGBM over the transformer?** Tree ensembles are state of the art on small and medium tabular data (Grinsztajn et al., 2022). They handle missing values natively, need no feature scaling, are well calibrated here without post-processing, and are fully explainable with TreeSHAP. The bundle is also small and can be audited.

### 4.3 Operating points (decided *before* testing)
- **Refer** threshold: the lowest score that reaches sensitivity ≥ 0.85 on validation data.
- **Monitor** threshold: sensitivity ≥ 0.95.
- This gives three tiers (refer / monitor / no concern), and every tier is reachable; a regression test enforces that.
- Why fixed sensitivity? In screening, a missed child is costlier than an extra observation. Comparing models at one shared, pre-set operating point keeps the comparison fair.

### 4.4 Uncertainty: class-conditional (Mondrian) conformal prediction
- Non-conformity score: `1 − p̂(true class)`.
- Compute the (1−α) quantile separately for positives and negatives on calibration data, with α = 0.1.
- The prediction set is {0}, {1} or {0, 1}. A set of {0, 1} is reported as **"uncertain → re-screen"**.
- Why class-conditional? Ordinary conformal prediction covered 90% *overall* but only **52–64% of affected children**, because the guarantee is dominated by the many negatives. Mondrian conformal covers **0.94 of affected and 0.90 of unaffected children**.
- The old system's "90% guaranteed" interval had hard-coded widths and covered **0%**.

### 4.5 Calibration
- LightGBM ECE = **0.017** with no post-processing.
- The FT-Transformer trained with Asymmetric Loss had ECE 0.275. ASL deliberately pushes probabilities up. **Temperature scaling made it worse (0.314)**, because one temperature rescales the logits but cannot remove a constant bias.

### 4.6 Explainability
TreeSHAP gives the top skills behind each result (for example, "slow pseudoword decoding" or "slow number-fact retrieval"). The Gemini explainer turns these into plain language for parents, and child names are never sent.

### 4.7 Packaging (lesson from the audit)
The Normer, the 4 × 3 models, the thresholds and the conformal quantiles go into **one JSON bundle** (no pickle) with a **SHA-256 checksum**. At load time, the feature names are checked against the extractors. Every prediction is stored with the model version, so real labelled data accumulate for re-training.

---

## 5. Results cheat-sheet (memorise these)

| Claim | Number |
|---|---|
| Production pipeline macro AUROC | **0.858 ± 0.012** (95% CI 0.846–0.869) |
| Per disorder (deployed bundle, 4000-child test): dyslexia / dyscalculia / dysgraphia | AUROC 0.855 / 0.853 / 0.859; sens 0.88 / 0.86 / 0.83; NPV 0.98–0.99; ECE ≤ 0.012 |
| Per disorder, FT-Transformer (ASL) | 0.808 / 0.817 / 0.789 (we beat it on every disorder) |
| Single test vs full battery | loses ≤ 0.004 AUROC, but only the full battery catches comorbidity |
| Logistic regression / FT-Transformer (ASL+Dice) / FT (BCE) | 0.807 / 0.804 / 0.810 |
| Gain vs unadjusted models (paired bootstrap) | +0.048 to +0.062, p < 0.001 |
| Gain vs LR with the same covariates | +0.007 [0.002, 0.012] (small but consistent) |
| External site B AUROC | 0.846 (drop of only 0.012); spec. 0.65 vs ~0.42 for unadjusted models |
| Covariates unknown | 0.803 (the app *must* collect age and language) |
| Operating point | sens 0.856, spec 0.685, PPV 0.178, NPV 0.984 |
| Calibration (ECE) | 0.017 (pipeline) vs 0.275 (ASL) vs 0.314 (ASL + temperature scaling) |
| Conformal coverage | 0.94 affected / 0.90 unaffected |
| Sensitivity analysis | best or within 0.005 of best in **22/22** settings; Kendall τ = 0.89 |
| Learning curve, 250 children | LightGBM 0.811 vs LR+cov 0.760 vs FT 0.697 |
| Missing data, 40% extra missing | pipeline 0.858 → 0.813; LR → 0.757 |
| Language FPR gap (dyslexia, FT unadjusted) | 0.48 Hindi vs 0.38 English; adjusted LR 0.36 vs 0.34 |
| DSM-5 questionnaire adds | +0.001 AUROC (CI −0.002 to 0.005): not significant |
| Criterion D rule | spec 0.684 → 0.760 but sens 0.860 → 0.681, so **defer, don't exclude** |
| Handwriting, old scorer | neat touch writing 60–62, neat mouse writing 54–56 vs tremor 78–82 |
| Handwriting, new scorer | all 9 neat writers 99–100; flags 11/12 impaired writers |
| Whisper | 0 WER on 20 clean clips, median 0.44 s/clip (RTX 2050) |
| ORF at 10% WER | ranking preserved (r ≥ 0.98), flag specificity drops to 0.89–0.95 |
| Audit | 17 defects; the deployed screen flagged **0 children** |

**School-of-500 interpretation:** about 180 referrals per disorder = 34 true + 145 false positives, to find 34 of 40 affected children. So SwarSetu is a **first-stage rule-out screen**, not a diagnostic tool.

---

## 6. Handwriting: why the old scorer measured the device

- Touch and pen screens fire 120–240 pointer events per second, so consecutive points are only **1–2 px apart**. At that scale, **pixel quantisation looks like tremor.**
- The old "precision" = chord / path length, which penalises *every curved letter* (an "o" is maximally "imprecise").
- **Result:** neat writing on a touch screen scored lower than tremulous writing on a pen.

**New analysis: 4 domains**

1. **Motor control: jitter index** `J = L₁ / L₄ − 1`. Resample each stroke at 3% of its *own size*, then compare path length after light (σ = 1) versus heavier (σ = 4) Gaussian smoothing. The extra length is high-frequency wobble. Because everything is relative to stroke size, the index is invariant to sampling rate, screen size and letter size.
2. **Fluency:** speed in letter-heights per second, mid-stroke halts (speed < 15% of the stroke median for ≥ 120 ms) and pauses between strokes, with different expectations per device. Mouse input is down-weighted.
3. **Layout:** robust slope and scatter of letter bottoms and tops, ignoring dots, crossbars and descenders.
4. **Legibility:** the self-hosted TrOCR reads the item, scored as 1 − CER versus the prompt. Simple shapes get geometric checks.

Weights: 0.40 legibility, 0.25 fluency, 0.20 motor, 0.15 layout. **Any domain below 60 forces at least moderate risk.** If handwriting is weak but spelling and composition are fine, the report points to a motor-coordination (OT) check, not an SLD. That follows DSM-5, where written-expression disorder is about spelling, grammar and organisation, not neatness.

---

## 7. DSM-5 alignment

| Criterion | What it requires | How SwarSetu covers it |
|---|---|---|
| A | ≥ 1 of 6 symptoms persisting ≥ 6 months despite targeted help | Teacher questionnaire: frequency per symptom, duration, help received |
| B | Attainment well below age expectation, interfering with school | **Tests** (age-normed) + teacher-rated attainment |
| C | Onset in school years | Questionnaire |
| D | Not better explained by intellectual disability, vision/hearing, language proficiency, inadequate instruction, etc. | Questionnaire flags, applied **per domain** |

- **Per-domain D logic:** limited English proficiency can explain poor reading and writing, but *not* poor number sense. Interrupted schooling or suspected intellectual disability apply to all three domains.
- **Four statuses:** consistent with DSM-5 (refer) / exclusion review (fix the D factor, then re-screen) / partial (lists the missing criteria) / not indicated.
- **New specifier subtests:** oral reading fluency (WCPM), number-facts fluency, and dictation + sentence + composition for written expression.
- **Honest finding:** the questionnaire does *not* improve AUROC. Its value is **validity and interpretability**: it stops a child who needs glasses, or who is still learning the language, from being labelled "likely dyslexic".

### ORF alignment algorithm
A semi-global edit distance between the transcript and the passage:
- the child can stop anywhere (free end gaps),
- repetitions are not counted as words read,
- a one-letter ASR slip is tolerated on words of 5 or more letters.

WCPM = words correct / minutes, compared against Hasbrouck & Tindal norms. A naive transcript word count overestimates WCPM by 4–13, because misread and repeated words get counted.

---

## 8. The deployment audit: the three-defect chain

1. **Train/serve skew:** the model was trained on standardised features but served raw [0, 1] values.
2. **Artefact mismatch:** the checkpoint had no thresholds, so the engine loaded `thresholds.json` and `temperature.json` from an *older run*.
3. **Regime mismatch:** thresholds fitted on deterministic probabilities were applied to MC-dropout averages of tempered probabilities.

The result: served scores sat at 0.22–0.33 while the thresholds were 0.91–0.93, so **sensitivity was 0**. Through the API, an impaired reader scored 0.264 and a strong reader 0.247, both "Low".

Other notable defects:
- Early stopping restored the *last* epoch, because it kept a live `state_dict` reference instead of a copy.
- The "High" tier could never be reached (1.1 × threshold > 1).
- The fairness status was hard-coded.
- Legacy "neural" predictors had untrained random weights (AUROC 0.475).

**Five lessons** (worth stating as general contributions):
1. Ship the model, preprocessing and thresholds as one verified artefact.
2. Test behaviour end to end ("does risk rise with impairment through the API?"), not just HTTP 200.
3. Compare models at the same pre-registered operating point.
4. Compute uncertainty and fairness claims from model outputs; never hard-code them.
5. Check that each measure tracks the child, not the device.

---

## 9. Hard questions you should expect (and short answers)

**"All your data is synthetic. Why should we believe anything?"**
> We agree it is the main limitation, and we say so in the abstract. The synthetic study answers a different question: not "how accurate is it on children" but "which pipeline design is robust under realistic measurement conditions". To keep it from flattering our method, we ran a 22-setting sensitivity analysis on our own generator's assumptions, and the ranking held (Kendall τ 0.89). Real-data collection is built in: every assessment is logged with its model version and accepts a confirmed diagnosis. The next step is a prospective study with blinded specialist assessment and ethics approval.

**"You designed the generator, so of course your model wins."**
> That is exactly why we ran the sensitivity analysis. We also report the setting where we *don't* win clearly: with no age effect, all models converge, and the transformer is marginally ahead (0.854 vs 0.853). We attribute the gain to norming, not to LightGBM.

**"Why did you abandon the transformer? Isn't deep learning better?"**
> Not on small tabular data. That is a known result (Grinsztajn 2022), and we reproduce it. Early stopping chose epoch ~2 in every run, so it overfits 3600 children almost immediately. At 250 children it gets 0.697 versus 0.811. Real SLD datasets are small, so that regime is the one that matters.

**"PPV is only 0.18. Isn't that useless?"**
> At 6–8% prevalence and 85% sensitivity, any screen has low PPV. School vision screens behave the same way. NPV is 0.984, so a negative screen is very reliable. It is designed as stage one of a stepped pathway: rule children out and prioritise observation, then specialists assess.

**"Why is the AUROC only 0.86 when the old one was 0.97?"**
> The old 0.97 came from a benchmark where plain logistic regression also scored 0.96. It measured nothing. With realistic label noise, even an oracle gets ~0.90, so 0.86 is close to the achievable ceiling.

**"How do you handle fairness?"**
> We report false-positive rates by home language and age at the operating point. Norming narrows the gaps (dyslexia FPR 0.48 vs 0.38 unadjusted becomes 0.36 vs 0.34 adjusted). A residual language gap remains, so DSM-5 Criterion D routes those children to review instead of referral.

**"What about privacy / children's data?"**
> Speech and handwriting recognition are **self-hosted** (Whisper, TrOCR), so raw audio and handwriting never go to third-party APIs. The LLM explainer receives no child names. A real deployment would need parental consent and ethics approval.

**"Does it work in Hindi?"**
> The interface and teacher reports are bilingual, and the model norms for home language. But TrOCR does not read Devanagari, the reading-fluency norms are US English norms, and the ASR was not tested on child or Hindi speech. These are listed limitations. The ORF simulation shows exactly how much 10–20% WER degrades the flag, so we know what to measure locally.

**"Why conformal prediction instead of MC dropout?"**
> MC dropout gives a spread, not a guarantee, and the old system's MC-based thresholds were part of the failure chain. Conformal prediction gives a finite-sample coverage guarantee; the class-conditional version extends it to the rare positive class.

**"What is novel here?"**
> Four things. (1) A realistic generator for *joint* three-disorder screening with confounds and comorbidity. (2) A norming-based pipeline with class-conditional conformal sets, packaged so it can be audited. (3) Device-invariant handwriting metrics. (4) A documented audit showing how ML screening systems fail silently. Few papers report their own system's failures; we treat that as a contribution.

---

## 10. How to reproduce

```bash
# experiments (writes results/*.json)
python backend/reports/realistic_eval/evaluate_all_models.py
python backend/reports/realistic_eval/lightgbm_dynamics.py
python backend/reports/realistic_eval/sensitivity_bootstrap.py     # ~1.8 h
python backend/reports/realistic_eval/dsm5_evaluation.py
python backend/reports/realistic_eval/defect_checks.py
# paper figures + tables
jupyter nbconvert --to notebook --execute --inplace paper/SwarSetu_Paper.ipynb
```
