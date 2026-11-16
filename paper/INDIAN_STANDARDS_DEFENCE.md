# SwarSetu on Indian Ground: Standards, Positioning and Defence

*Brief for viva panels, Indian reviewers and the ethics committee (IEC). Read Part 1 and Part 4 first; the rest is your reference when a question goes deep.*

Items marked **(verify)** come from secondary sources. Check them against the original gazette or report before you quote them in writing.

---

## Part 1 — The one-paragraph position

> **SwarSetu is a Tier-1, teacher-administered *screening* aid, not a diagnostic or certification tool.** Under Indian law, diagnosing and certifying a specific learning disability (SLD) is reserved for the medical authority defined in the DEPwD guidelines, using the NIMHANS SLD battery after vision, hearing and intelligence have been checked. SwarSetu sits *before* that step, in the same place as NCERT's PRASHAST checklist and NBRC's DALI screening tools. It tells a teacher which children should be referred first, records why, and never produces a label. Its items follow NCERT learning outcomes grade by grade, and its classification follows DSM-5 Criteria A–D (equivalent to ICD-11 developmental learning disorder). The model has so far been validated only on synthetic data. The study we propose uses the Indian reference standard: the NIMHANS battery plus an IQ test, administered blind by an RCI-registered clinical psychologist.

If you remember one sentence: **"We screen; Indian law and Indian clinicians diagnose, and our validation uses their reference standard."**

---

## Part 2 — The Indian standards that apply

| # | Standard | What it says (relevant part) | Where SwarSetu stands |
|---|---|---|---|
| 1 | **Rights of Persons with Disabilities Act, 2016** | SLD is one of the 21 specified disabilities. It is defined as a deficit in processing language that may show as difficulty to comprehend, speak, read, write, spell or calculate, and it includes dyslexia, dysgraphia, dyscalculia, dyspraxia and developmental aphasia. | Covers the three most common SLD forms (reading, writing, maths). Dyspraxia and aphasia are out of scope; the handwriting module points motor-only difficulty to a coordination check. |
| 2 | **DEPwD Guidelines for assessment of specified disabilities** (4 Jan 2018; SLD part amended 9 Dec 2020) | Certification is done by a medical authority; the amendment added psychiatrists. The NIMHANS SLD battery is specified, and testing positive on it counts as benchmark disability (>40%). Certification is from age 8, with re-certification at 14 and 18. Vision, hearing and neurological checks come first, then IQ; SLD testing reportedly only if **IQ > 85 (verify)**. | **We do not certify.** Reports say "screen-positive: refer for assessment", never "has SLD". In the study, the NIMHANS battery is the reference standard. Children under 8 get an *at-risk / monitor* result, which matches the guidelines' own teacher screening at Class III / age 8. |
| 3 | **RCI Act, 1992** (Rehabilitation Council of India) | Only professionals registered with RCI (clinical psychologists, special educators and others) may practise assessment and rehabilitation. | The reference-standard assessor must be RCI-registered; name them in the protocol. Teachers only run the screen. |
| 4 | **IPS Clinical Practice Guidelines on SLD** (Shah et al., *Indian J Psychiatry* 2019; 61 Suppl 2:211–225) | Comprehensive assessment by a team: history, exclusion of sensory and intellectual causes, curriculum-based and standardised testing. Gives prevalence of **3–10%**, and notes there is no common consensus on diagnostic criteria. | Our Criterion-D questionnaire asks the same exclusion questions (vision, hearing, language of instruction, schooling). Our synthetic prevalence of 6–8% sits inside the 3–10% range. |
| 5 | **IACP practice guidelines for SLD** (2020 revision) and **IAP consensus statement on LD** (Nair et al., 2017) | Clinical-psychology and paediatric guidance on assessment, again with screening before referral. | Same positioning; cite these alongside IPS so psychologists and paediatricians both see their bodies acknowledged. |
| 6 | **NEP 2020** | Calls for early identification of learning disabilities, with support from the earliest grades. | This is the reason for a Grade 1–12 screen and for screening before age 8 (identification ≠ certification). |
| 7 | **NCERT Learning Outcomes at the Elementary Stage (2017)** and NCERT textbooks | Grade-wise competencies in language and mathematics. | The item bank (`frontend/src/lib/ncertItemBank.ts`, version `ncert-graded-2026.11`) has a separate level for each of Grades 1–8, then 9–10 and 11–12, pitched at these outcomes in English and Hindi. |
| 8 | **NIPUN Bharat (2021)** Lakshyas | Foundational literacy and numeracy targets. Class 3: read about **60 words/min** with comprehension. Class 2: about **30–45 wpm** (sources differ: some say 45–60). | **Gap:** our oral-reading flag uses US norms (Hasbrouck & Tindal 2017). Answer in Part 4, Q3. |
| 9 | **Foundational Learning Study 2022** (NCERT/MoE) | First national oral-reading-fluency and numeracy benchmarks for Grade 3 in 20 languages. | The source for Indian, language-specific reading benchmarks; adopt these when we re-calibrate. |
| 10 | **PRASHAST** (NCERT/CIET, launched 6 Sep 2022; now 2.0) | A school checklist for all 21 RPwD disabilities. Part 1 is filled by the class teacher, Part 2 is validated by a special educator, then children are referred to assessment camps. Explicitly *not* diagnostic. | **Our closest Indian precedent.** PRASHAST is a checklist for all 21 disabilities; SwarSetu adds performance-based testing for the three SLD domains. They complement each other: a PRASHAST SLD flag can trigger a SwarSetu session. |
| 11 | **DALI** (NBRC Manesar, DST-funded; UNESCO MGIEP app) | Dyslexia screening tools for teachers in Hindi, Marathi, Kannada and English: the JST covers Classes 1–2 and the MST Classes 3–5. A psychologist battery (DALI-DAB) is standardised on 1,013 bilingual children. | **Prior art you must cite.** DALI covers reading only, Classes 1–5. SwarSetu adds maths and writing, Classes 1–12, and a joint model for comorbidity. DALI-DAB can serve as an additional reading reference in the study. |
| 12 | **ICMR National Ethical Guidelines for Biomedical and Health Research Involving Human Participants (2017)** and **ICMR guidelines for research involving children (2017)** | IEC approval; written informed consent from a parent or guardian; assent from the child (verbal for younger children, written for older children); extra protections for vulnerable participants; data confidentiality. | Required before any real child is screened for research. Prepare consent and assent forms in Hindi and English. |
| 13 | **Digital Personal Data Protection Act, 2023** and **DPDP Rules 2025** (G.S.R. 846(E), notified 13/14 Nov 2025) | §9: **verifiable parental consent** for under-18s (Rule 10: a tick-box is not enough; DigiLocker-style verification is acceptable). §9(3): **no tracking or behavioural monitoring of children**. The Fourth Schedule exempts **educational institutions** when monitoring is limited to educational purposes or children's safety, and has health-related exemptions **(verify exact wording)**. Rule 10 obligations are phased in, reportedly in force **13 May 2027 (verify)**. | We record behaviour during the test (attention, persistence). Defend this as *educational assessment carried out by or for the school*, which is the Fourth Schedule purpose, and never use it for anything else. Gemini receives only age, grade, scores and model output, never a name or ID. **Action:** move the Supabase project from Tokyo (ap-northeast-1) to Mumbai (ap-south-1). Cross-border transfer is legal unless a country is restricted, but IECs prefer data kept in India. |
| 14 | **CTRI (Clinical Trials Registry – India)** | Mandatory for clinical trials; observational diagnostic-accuracy studies are commonly registered voluntarily. | Recommended: register the validation study before enrolment. It pre-empts the "you chose the threshold after seeing data" critique. |

### The international standards we work with, and why they don't conflict

| Standard | Role in SwarSetu | Indian link |
|---|---|---|
| **DSM-5 / DSM-5-TR** Criteria A–D for SLD | Defines what the three tests measure (Criterion B) and what the teacher questionnaire records (A, C, D). | The IPS 2019 guideline itself tabulates DSM-5 alongside ICD-10. Indian psychiatrists diagnose with DSM-5/ICD. |
| **ICD-11** 6A03 Developmental learning disorder | Same construct; WHO standard used in Indian health records. | India is a WHO member state; mention ICD-11 so medical reviewers see it. |
| **STARD 2015** (diagnostic-accuracy reporting) and **TRIPOD+AI (2024)** | How the validation study will be reported. | Indian journals (IJP, IJPM, Indian Pediatrics) follow ICMJE/EQUATOR guidelines. |
| **Hasbrouck & Tindal 2017** ORF norms; CBM fact-fluency benchmarks | Advisory "below expected" flags only; the model itself uses age-normed scores. | To be replaced or complemented by NIPUN/FLS benchmarks (Gap 1). |
| **Conformal prediction, calibration, subgroup fairness** | Uncertainty and equity guarantees. | Directly answers the concern that "AI will mislabel Hindi-medium children". |

---

## Part 3 — What makes SwarSetu defensible in India

1. **It never diagnoses.** Every output is a referral tier with uncertainty ("uncertain: re-screen" is a valid output). That keeps it legally clear of RPwD/DEPwD certification and professionally clear of RCI practice.
2. **It uses the Indian reference standard.** The validation plan uses the NIMHANS SLD battery and an IQ test by an RCI-registered clinical psychologist, blinded to SwarSetu's result. You are measuring yourself against the same yardstick Indian certification uses.
3. **It is built for Indian classrooms.**
   - NCERT grade-wise items in Hindi and English.
   - Covariates for home language and device.
   - Criterion-D questions about the language of instruction, so a Hindi-medium child struggling with English is treated as an English learner, not a dyslexic child.
   - It runs on a ₹10–15k tablet or a school laptop.
4. **It covers all three domains together.** One in four to one in two children with one SLD has another, so a reading-only screen misses co-occurring maths and writing difficulty.
5. **It is honest about its evidence.** The paper says plainly that results are synthetic and makes no clinical claim. Indian reviewers have seen many "98% accuracy" student papers; candour is your advantage.
6. **It keeps data local where it matters.** Speech recognition (Whisper) and handwriting recognition (TrOCR) run on the school's own machine, so children's audio and handwriting never leave it. The research data store sits on the laptop in India.
7. **Its data is traceable.** Every result carries the model version and the question-bank version (`item_bank`), so data collected under different item sets is never silently mixed.

---

## Part 4 — Likely questions from Indian researchers, and how to answer

**Q1. "Under the DEPwD guidelines SLD can only be certified from age 8. Why are you screening 6-year-olds?"**
Screening is not certification. The same guidelines place teacher screening at Class III / age 8, NEP 2020 asks for early identification, and NIPUN Bharat sets Class 1–3 targets precisely so that struggling children are caught early. For under-8s SwarSetu reports "monitor / at risk", never "screen-positive for SLD". In the study we report diagnostic accuracy only for children aged 8 and over, where the NIMHANS battery applies, and follow younger children longitudinally.

**Q2. "Why DSM-5? India uses the NIMHANS battery."**
They answer different questions. DSM-5 (and ICD-11) defines the disorder; the NIMHANS battery is a *measurement instrument* used to establish it. The IPS 2019 guideline uses DSM-5 criteria. We use DSM-5 to decide what to measure, and the NIMHANS battery as the reference standard to check whether we measured it well.

**Q3. "Your reading norms are American. Indian children will all look slow."**
Concede the point, then show three facts.
- **The flag is advisory.** The US-normed words-per-minute flag is only a teacher-facing hint. The model uses words per minute as a continuous score normed against same-age, same-language children (the normer), not against the US cut-off.
- **Indian benchmarks exist and we cite them.** NIPUN Bharat (about 60 wpm by Class 3) and FLS 2022 (language-specific Grade 3 benchmarks) are the Indian anchors; switching the flag to them is planned.
- **No Hindi words-per-minute norms exist** beyond these, which is why the normer learns local norms from the study sample.

*(If asked "why not switch now?": the NIPUN/FLS benchmarks cover Grade 3 or Classes 1–3 only, so above that you would still need local norms, which the study produces.)*

**Q4. "You don't test IQ. How do you exclude intellectual disability (DSM Criterion D, and the DEPwD IQ requirement)?"**
A screen should not include an IQ test: it would take far longer and needs a psychologist. The teacher questionnaire records concerns about general learning, and every screen-positive child is referred for full assessment, where the psychologist runs the IQ test (MISIC, WISC-IV India or Binet-Kamat, as the clinic uses) before the NIMHANS battery. Excluding intellectual disability happens at the diagnostic stage, exactly as the guidelines intend.

**Q5. "Your results are synthetic. So you have no results."**
We have results about the *pipeline*, and we say so in the title and abstract. Synthetic data let us show that:
- the original 0.97 AUROC was an artefact of an easy benchmark;
- age and language norming is what drives performance;
- the deployed system had 17 defects and flagged no child.

None of this needs real children, and all of it had to be fixed *before* real children were tested. The clinical-accuracy study is the next step, and the software already logs everything that study needs.

**Q6. "The NCERT items are your own. Where is their validity?"**
Content alignment is not validity, and we don't claim validity. Validation follows the standard Indian psychometric route:
1. An expert panel rates content validity (Lawshe's CVR / content validity index), using teachers and an RCI special educator for each grade level.
2. A pilot gives item difficulty (target: 60–85% correct for typical children at grade) and discrimination (item–total correlation above 0.2).
3. Items that fail are revised, and the bank version is bumped.

The bank was built so each grade has one review item, two at grade level and one stretch item, which is the shape a screener needs.

**Q7. "Only English and Hindi. India has 22 scheduled languages."**
True, and a stated limitation. Hindi covers the largest single group of learners, and English is the most common medium of instruction in private schools. The architecture is language-agnostic: items, passages and the home-language covariate are per-language, and DALI shows how Indian tools extend language by language (Hindi → Marathi → Kannada). Marathi and Bengali are natural next steps.

**Q8. "Children in Hindi-medium schools will be flagged for English difficulties."**
That is exactly Criterion D, and we handle it in two ways.
1. The model adjusts for home language. In simulation, the gap in false positives between English- and Hindi-dominant children shrinks to 0.32 vs 0.39 for dyslexia.
2. The questionnaire records limited proficiency in the language of instruction, and the result becomes "exclusion review — address and re-screen", not referral. Children can also be tested in Hindi.

**Q9. "Why not just use PRASHAST or DALI?"**
They are complementary, not competitors.
- **PRASHAST** is an observation checklist for 21 disabilities and has no performance testing.
- **DALI** tests reading in Classes 1–5.
- **SwarSetu** tests reading, maths and writing in Classes 1–12 with one joint model, because co-occurrence is common.

A school could run PRASHAST across the class, then SwarSetu for children flagged for SLD. Say this warmly; NCERT and NBRC researchers may be in the room.

**Q10. "Teachers aren't trained to administer this."**
The test is self-paced, with spoken instructions and touch input. The teacher supervises and fills a short profile, much as with PRASHAST Part 1. A 30-minute orientation is part of the study protocol, and the in-app tour and help pages cover the rest.

**Q11. "AI labelling children: stigma and harm."**
- **No labels.** Reports use "difficulty", "check" and "refer", never "dyslexic", and growth in the class view reflects participation, not ability.
- **Parents choose.** The parent dashboard is opt-in, per child, controlled by the school admin.
- **Mistakes are cheap.** A false positive costs one specialist visit; a missed child costs years. That is why the threshold favours sensitivity (85%), with the false-positive load stated openly (PPV about 0.18 in a single-stage screen) and a stepped pathway recommended.

**Q12. "DPDP Act: you're collecting children's data and monitoring behaviour."**
- **Parental consent.** We collect verifiable parental consent (the study consent form plus the DPDP Rule 10 mechanism) before any data are stored.
- **Behaviour features.** Attention and persistence during the test are recorded only for the educational assessment requested by the school, which is the purpose the Fourth Schedule exempts for educational institutions. They are never used for advertising, profiling or anything outside the assessment.
- **Local processing.** Audio and handwriting are processed locally; the explanation service receives no name or ID.
- **Storage.** Research data stay on an encrypted machine in India, and the cloud project is moving to the Mumbai region.

**Q13. "Speech recognition won't understand Indian children's accents."**
Agreed that it must be measured, and the paper shows why. Recognition errors bias words per minute downward but preserve the ranking of readers (r ≥ 0.98). At 10% word error rate the flag's specificity drops to 0.89–0.95. The study measures word error rate on Indian children's speech in each language, and teachers confirm flagged readings.

**Q14. "Handwriting recognition doesn't read Devanagari."**
Correct; it is a stated limitation. For Hindi, spelling is scored by the teacher's check, which the system already supports, and handwriting kinematics (fluency, jitter, layout) don't depend on the script. A Devanagari recogniser is future work.

**Q15. "Your prevalence assumptions?"**
6–8% per disorder, inside the IPS 2019 range of 3–10% and the 5–15% range in Indian studies. The sensitivity analysis varies prevalence, and the ranking of models holds.

**Q16. "Who owns the data and the model? Is this commercial?"**
State your institution's position honestly. If the code is open and data are held by the institution under the IEC protocol, say so. Don't improvise on IP.

**Q17. "How will you choose the referral threshold without biasing results?"**
The threshold is pre-specified in the protocol (sensitivity ≥ 0.85 on the development set) and frozen before the test set is scored. Registering on CTRI makes this verifiable.

**Q18. "Sample size?"**
To estimate sensitivity of 0.85 within ±0.10 (95% CI) you need about 50 confirmed cases per disorder. At 5–10% prevalence that is 500–1,000 school children, or fewer with clinic enrichment; state the enrichment and its spectrum-bias caveat.

---

## Part 5 — Gaps to close, ranked

| Priority | Gap | Action | Owner / evidence |
|---|---|---|---|
| 1 | No IEC approval | Submit the protocol under ICMR 2017: consent and assent forms (Hindi/English), data-management plan, DPDP section | Institution IEC approval letter |
| 2 | Reference standard not fixed | Agreement with an RCI-registered clinical psychologist: NIMHANS SLD battery plus IQ test, blinded | MoU or letter; RCI registration number |
| 3 | Cloud data in Tokyo | Move Supabase to Mumbai (ap-south-1), or keep identifiable data local only | Updated data-flow diagram |
| 4 | US reading norms | Add NIPUN/FLS benchmarks for Grades 1–3; derive local norms from the study | Code change and paper update |
| 5 | Item-bank validity | Expert CVI panel, then a pilot (n ≈ 30 per grade) for item difficulty and discrimination | CVI table and item statistics |
| 6 | Study not registered | Register on CTRI before enrolment | CTRI number |
| 7 | Prior art not cited | DALI, PRASHAST, IPS/IACP/IAP guidelines (now in the paper) | Done |
| 8 | Speech recognition accuracy on Indian children | Measure word error rate per language on 50 recorded children | WER table |

---

## Part 6 — Key numbers to have ready

- **SLD prevalence in India:** 3–10% (IPS CPG 2019); 5–15% across studies.
- **Certification (DEPwD):** age 8, re-certified at 14 and 18; NIMHANS battery; psychiatrist added to the authority in Dec 2020.
- **NIPUN Class 3 target:** about 60 wpm with comprehension.
- **DALI:** 4 languages, Classes 1–5. **PRASHAST:** 21 disabilities, launched 6 Sep 2022.
- **SwarSetu (synthetic):** macro AUROC 0.858 [0.846–0.869]; ECE 0.017; class-conditional conformal coverage 0.94/0.90; PPV about 0.18 at sensitivity 0.85.
- **Question bank:** 10 grade levels × 10 subtests × 3–4 items, in English and Hindi; version `ncert-graded-2026.11`.

---

## Sources

- RPwD Act 2016 and mental-health implications — [PMC6436405](https://pmc.ncbi.nlm.nih.gov/articles/PMC6436405/)
- DEPwD guidelines, Jan 2018 — [MSJE notification](https://disabilitylaw.org.in/wp-content/uploads/2020/08/ID_msje_certification_guidelines-Jan2018_english.pdf); Dec 2020 amendment — [PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1794750&reg=48&lang=2), [NewzHook](https://newzhook.com/story/depwd-doctors-with-disabilities-sld-guidelines-amended-allowing-psychiatrists-to-diagnose-specified-learning-disabilities-sld/)
- SLD and the RPwD Act (IJP 2023) — [Indian Journal of Psychiatry](https://journals.lww.com/indianjpsychiatry/fulltext/2023/65070/revisiting_specific_learning_disorder_in_context.1.aspx)
- IPS Clinical Practice Guidelines on SLD (Shah et al., 2019) — [PDF](https://indianpsychiatricsociety.org/wp-content/uploads/2019/01/Shah_2019_Clinical_Practice_Guidelines_on.pdf), [PMC6345134](https://pmc.ncbi.nlm.nih.gov/articles/PMC6345134)
- IACP practice guidelines for SLD (2020) — [PDF](https://iacp.in/wp-content/uploads/2022/01/practice-guidelines-SLD-2020-revised-compressed.pdf)
- NIPUN Bharat / FLS 2022 benchmarking — [National ORF benchmarking report](https://new.air.org/sites/default/files/2022-09/National-Report-Benchmarking-ORF-Numeracy-India-2022.pdf), [Tribune summary](https://www.tribuneindia.com/news/punjab/children-reading-in-punjabi-hindi-and-english-show-highest-level-of-oral-reading-proficiency-says-ncert-study-429738)
- DALI — [UNESCO MGIEP](https://mgiep.unesco.org/article/dyslexia-assessment-for-languages-of-india-dali), [DALI-DAB standardisation (Annals of Dyslexia)](https://link.springer.com/doi/10.1007/s11881-021-00227-z)
- PRASHAST — [NCERT CIET](https://ciet.ncert.gov.in/prashast), [Brochure](https://ciet.ncert.gov.in/storage/app/public/files/19/Brochure/PRASHAST_Brochure_26_EN.pdf), [Vikaspedia](https://www.vikaspedia.in/education/teachers-corner/addressing-specific-problems-of-children/prashast-:-a-disability-screening-checklist-for-schools)
- DPDP Rules 2025, Rule 10 — [dpdpa.com](https://www.dpdpa.com/dpdparules/rule10.html), [Wikipedia](https://en.wikipedia.org/wiki/Digital_Personal_Data_Protection_Rules,_2025); Fourth Schedule — [dpdpa.com](https://www.dpdpa.com/schedule/schedule4.html), [DSCI FAQ](https://www.dsci.in/files/content/documents/2025/FAQs-on-Children-and-PwD-personal-data.pdf), [Storyboard18](https://www.storyboard18.com/digital/dpdp-rules-carve-out-key-exemptions-for-healthcare-providers-schools-and-childcare-services-processing-childrens-data-84208.htm)
