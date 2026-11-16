# How to Pitch SwarSetu to the Conference Panel

*A 10-minute talk plus 5 minutes of Q&A. If your slot is shorter, see the 3-minute version at the end.*

---

## The core message (if they remember one sentence)

> **"For AI screening of learning disabilities, measuring the child correctly matters more than the model architecture, and we show this by honestly re-evaluating our own system."**

Your edge over other teams is **honesty and rigour**. Most student papers report 97% accuracy. You found that your own 97% was an artefact of the benchmark, fixed it, and can show *why* the new result is trustworthy. Panels respect this a lot. **Lead with it; don't hide it.**

---

## Slide-by-slide script (≈10 slides, ≈1 min each)

### Slide 1 — Title (15 s)
"SwarSetu: Age- and Language-Normed Joint Screening for Dyslexia, Dyscalculia and Dysgraphia."
Give your names and institution, then go straight to the problem.

### Slide 2 — The problem (60 s)
- 5–15% of school children have a specific learning disorder (DSM-5).
- A quarter to a half of them have **more than one** of the three disorders.
- Specialists are scarce, especially in multilingual, rural India, so children are identified late or never.
- **Say:** "A teacher needs a cheap, quick first screen that covers all three disorders in one sitting. That is SwarSetu."

### Slide 3 — What SwarSetu does (60 s) → *show Fig. 1*
- One tablet session: reading (with a spoken passage), maths (with 1-minute number facts), handwriting (copying and dictation).
- Self-hosted speech (Whisper) and handwriting (TrOCR) recognition. **Children's data stays on our server.**
- Output: a risk tier per disorder, the skills behind it, a DSM-5 status, and "uncertain → re-screen" when the model isn't sure.
- *Optional: a 20-second live demo or screenshot of the teacher dashboard. Only if it's rock-solid; otherwise show screenshots.*

### Slide 4 — The twist: our first result was too good (75 s) ⭐ *the hook*
- "Our first evaluation reported **AUROC 0.97**. Then we noticed that plain logistic regression *also* got 0.96."
- The cause: the synthetic data had an effect size of d ≈ 1.5 per feature, far larger than in real children.
- "A benchmark where everything scores 0.96 cannot tell a good model from a bad one. So we rebuilt it."
- **Pause here.** This is the moment the panel leans in.

### Slide 5 — A realistic benchmark (60 s)
- Liability-threshold model: 5 correlated abilities, so comorbidity *emerges* rather than being imposed.
- Real-world nuisance factors: **age** (skills grow every year), **home language** (Hindi-dominant children score lower on English phonology *without* a disorder), **finger vs pen**, missing data, and **imperfect diagnoses**.
- A shifted "external school" to test generalisation.
- **Say:** "Even an oracle that knows each child's true ability only reaches 0.90 here. That's the realistic ceiling."

### Slide 6 — Main result (75 s) → *show Table II (top rows) or a bar chart*
- The transformer we originally proposed: **0.804**. Logistic regression: **0.807**. "No better."
- Our pipeline (normed features + LightGBM): **0.858**, significantly better than every alternative (paired bootstrap, p < 0.001).
- At the external school it loses only 0.012.
- **The insight:** "The gain comes from *norming*: comparing a 7-year-old with other 7-year-olds of the same home language. Remove age and language information and we drop back to 0.80."

### Slide 7 — Why you can trust it (60 s) → *show Fig. 3 (sensitivity) or Fig. 2 (learning curve)*
- "We designed the generator, so we stress-tested our own assumptions: 22 variations, and we're best or within 0.005 of best in all 22."
- Best with only 250 children (0.81 vs 0.70 for the transformer). Real datasets are small, so this matters.
- Calibrated (ECE 0.017), and conformal sets cover **94% of affected children**, not just 90% on average.

### Slide 8 — Handwriting and fairness (60 s) → *show Table IV*
- "The old handwriting scorer gave neat writing on a touch screen 60/100, *lower* than writing with tremor. It was measuring the device, not the child."
- New device-invariant analysis: neat writing scores 99–100 on every device; 11 of 12 impaired writers are flagged.
- Fairness: Hindi-dominant children were wrongly flagged 48% of the time vs 38% for English-dominant. Norming closes most of that gap.

### Slide 9 — DSM-5 and the audit (60 s)
- A teacher questionnaire covers DSM-5 Criteria A, C and D, which tests can't see.
- **Honest finding:** it doesn't raise accuracy. But it stops a child who needs glasses, or is still learning English, from being labelled dyslexic. "Defer and re-screen, don't exclude."
- **Audit:** 17 defects. Three of them combined meant the deployed screen flagged **zero children**. "It returned HTTP 200 and looked fine." Lessons: ship the model and thresholds as one verified artefact, and test behaviour end to end.

### Slide 10 — Limitations, impact, next steps (45 s)
- "All results are synthetic. We say this in the abstract. These numbers are not clinical accuracy."
- It is a **first-stage rule-out screen**: NPV 0.98, PPV 0.18. It prioritises children for specialists; it does not replace them.
- Next: a pilot in partner schools with ethics approval, parental consent and blinded specialist assessment. The platform already logs every assessment so it can learn from confirmed diagnoses. Further work: Hindi reading norms and Devanagari handwriting.
- **Closing line:** "We think the most useful thing an AI screen can do is be *honest about what it knows*. That's what we built."

---

## Delivery tips

- **Numbers:** quote only 4–5 in the whole talk: **0.97 → realistic**, **0.804 vs 0.807**, **0.858**, **22/22**, **zero children flagged**. Too many numbers blur together.
- **Say "screening", never "diagnosis".** Panels pounce on that word for health AI.
- **Own the synthetic-data limitation before they raise it.** Saying it first turns a weakness into credibility.
- **Don't apologise for the transformer.** Frame it as a finding: "We tested the sophisticated option and showed, with statistics, that it isn't needed here."
- **Split roles** if presenting as a team: one person covers problem/system (slides 2–3), one covers results (4–8), one covers DSM-5/audit/limitations (9–10). Everyone should be able to answer the top 5 questions.
- **Time it tonight**, out loud, twice. Most people run 30–40% over on their first read-through.
- Keep slides **visual**: one figure or one big number per slide. The paper has the detail.
- Have `TECHNICAL_EXPLAINER.md` sections 5 and 9 open or printed as a backup for Q&A.

---

## Q&A playbook (top 8, short spoken answers)

| Question | 15-second answer |
|---|---|
| "It's all synthetic. So what?" | "Agreed, it's the main limitation. The synthetic study chooses a *robust design* before real data exist, and we stress-tested it across 22 assumptions. The system already collects labelled data for the clinical pilot." |
| "You built the generator, so you win." | "That's why we did the sensitivity analysis. We also report the case where we don't clearly win: with no age effect, everyone ties. That tells us the gain is norming, not the algorithm." |
| "Why not deep learning?" | "On small tabular data, trees win. That's a known result, and we reproduce it. At 250 children: 0.81 vs 0.70." |
| "PPV of 18% is low." | "Any screen at 7% prevalence has low PPV. NPV is 98%, so it reliably rules children out. It's stage one, not a diagnosis." |
| "Why did your accuracy go *down*?" | "The old 0.97 came from a benchmark where logistic regression scored 0.96. It wasn't measuring anything. 0.86 sits near the ~0.90 ceiling of realistic data." |
| "Bias across languages?" | "We measured it: a 10-point gap in false positives for Hindi-dominant children without adjustment, mostly closed by norming. The residual gap is handled by DSM-5 Criterion D review." |
| "Privacy?" | "Speech and handwriting models are self-hosted. No child audio or names go to third parties. A real deployment needs consent and ethics approval." |
| "What's novel?" | "A realistic three-disorder benchmark with confounds, a norming pipeline with class-conditional conformal guarantees, device-invariant handwriting metrics, and a public audit of how such systems fail silently." |

**If you don't know an answer:** "That's a good point we haven't tested. Our expectation is X, and it's a natural next experiment." Never invent a number.

---

## The 3-minute version (if the slot is short)

1. **Problem (30 s):** three common, co-occurring learning disorders and scarce specialists. SwarSetu screens all three in one tablet session.
2. **Twist (40 s):** our first result was 0.97, but logistic regression also got 0.96, so the benchmark was broken. We rebuilt it with realistic age, language, device and label noise.
3. **Result (50 s):** the original transformer gets 0.80, the same as logistic regression. Normed features + LightGBM get 0.86, significantly better, robust across 22 assumption changes, calibrated, with 94% coverage guarantees for affected children.
4. **Handwriting + audit (40 s):** the old handwriting scorer measured the device, not the child. An audit found the deployed system flagged zero children. Both are fixed.
5. **Close (20 s):** synthetic results, first-stage screen, a clinical pilot next. "Measuring the child correctly matters more than the model."

---

## Night-before checklist

- [ ] Fill in the author names and affiliations in the notebook title cell.
- [ ] Export figures from `paper/figures/` into the slides (300 dpi PNGs).
- [ ] Rehearse out loud twice with a timer.
- [ ] Memorise the 5 key numbers and the top 3 Q&A answers.
- [ ] Prepare a screenshot fallback for the demo (don't rely on Wi-Fi or a live backend).
- [ ] Bring the paper PDF on a USB drive and in email/cloud.
