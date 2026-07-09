# Phase 23 — Literature Summary

**Scope:** Peer-reviewed and authoritative industrial sources on EAF tap-to-tap time (TTT), electrical energy, burden mix (HM/DRI/scrap), oxygen/carbon/flux practice, and slag foaming. Preference for post-2010 publications.

**Method:** Systematic web search across Elsevier/ScienceDirect, Wiley, MDPI, IEEE-adjacent process journals, ISIJ, and equipment-vendor technical literature (Danieli, Tenova, Primetals, SMS, Midrex). Blogs excluded unless they reproduce peer-reviewed findings with citation.

---

## A. Tap-to-Tap Time and Electrical Energy — Causality

### Knutsen et al. (2020) — *Metals* 10(1):36
**Title:** Using Statistical Modeling to Predict the Electrical Energy Consumption of an EAF Producing Stainless Steel

**Key findings:**
- Decomposes TTT into charging, melting, refining, extended refining, tapping, preparation.
- Heat losses (radiation, convection, conduction) differ by sub-stage; losses are higher when steel is molten.
- TTT and sub-process delays are important predictors of electrical energy (EE).
- Any delay increases TTT; variables proportional to TTT become **nonlinear** in energy balance.

**Relevance to JSPL:** Supports treating total electrical energy (kWh) as **partially a consequence of TTT**, not purely a pre-heat decision variable.

---

### Sjunnesson et al. (2019) — *Metals* 9(9):959
**Title:** Predicting the Electrical Energy Consumption of Electric Arc Furnaces Using Statistical Modeling (review)

**Key findings:**
- Literature review of 40+ EAF energy models.
- Power-on time and EE are **strongly correlated** because plants maximize power during arcing.
- Warns against using power-on time to predict EE without careful causal framing — value must be **assumed then updated** during the heat.
- Recommends: scrap/additive composition, transparency of signs vs metallurgy, out-of-time validation.

**Relevance to JSPL:** Direct warning for our `POWER` / `POWER_PER_TONNE` / `HM_X_POWER` features if `POWER` is end-of-heat kWh.

---

### Pfeifer et al. (2021) — *Metals* 11(9):1348
**Title:** Application and Evaluation of Mathematical Models for Prediction of Electric Energy Demand Using Plant Data of Five Industrial EAFs

**Key findings:**
- Tested Köhle-type and data-driven models on 5 furnaces (2018–2020).
- Inputs: scrap grades, fluxes, coal, O₂, natural gas, power-on time, TTT, tap weight, temperature.
- Nonlinear interactions; coal/O₂/gas correlated with electrical demand.
- Median absolute errors ~2–4% on energy; wide scatter across furnaces.

**Relevance to JSPL:** Benchmark for separating **recipe inputs** from **time/energy outcomes**.

---

### Štore Steel / Kovačič et al. (2019) — *Energies* 12(11):2142
**Title:** Comprehensive EAF Electric Energy Consumption Modeling: A Pilot Study

**Key findings:**
- 25 parameters; delays among most influential for energy.
- Time savings could represent ~25% of average tapping time in their dataset.
- Lime/dolomite not always statistically significant (p>0.05) in their linear model — context-dependent.

**Relevance to JSPL:** Supports delay/power-off features; cautions on flux raw tonnage alone.

---

### TERI (2024) — Energy Efficiency Options in EAFs (industrial report)
**Key findings:**
- TTT 60–90 min typical; best practice <60 min; twin-shell 35–40 min.
- Fixed losses (cooling water, radiation) make **longer TTT → higher SEC (kWh/t)**.
- Hot DRI (600°C) can save ~150 kWh/t vs cold; HM charging provides large sensible heat.

**Relevance to JSPL:** Physical mechanism for TTT–energy coupling; not peer-reviewed but aligns with Elsevier literature.

---

## B. DRI, Metallization, HBI, and Burden Mix

### Kirschen, Badr & Pfeifer (2011) — *Energy* 36(10):6146–6155
**Title:** Influence of Direct Reduced Iron on the Energy Balance of the EAF

**Key findings:**
- Closed mass/energy balance model validated on 16 industrial EAFs.
- DRI increases slag volume, O₂ and carbon demand, and often **power-on time** vs scrap heats.
- **Metallization optimum ~94–96%**: low metallization → endothermic FeO reduction; very high → less CO, less bath agitation, worse heat transfer.
- DRI feeding rate ~27–35 kg/min·MW; foaming slag critical for arc efficiency.
- DRI at slag/metal interface aids melting; FeO reacts with bath carbon for foamy slag.

**Relevance to JSPL:** Core reference contradicting "more DRI always reduces TTT." Explains JSPL expert comment on metallization and arc stability **conditionally**.

---

### Memoli, Kirschen & Pfeifer (2021) — *Processes* 9(2):402
**Title:** Process Improvements for DRI Melting in the EAF with Emphasis on Slag Operation

**Key findings:**
- 16-plant survey: 100% scrap vs 60–95% DRI heats.
- Scrap heats: 340–390 kWh/t, TTT 50–60 min.
- DRI heats: 530–680 kWh/t, TTT **60–100 min**.
- Extra lime/doloma for DRI gangue → +0.37–0.50 kWh/kg slag former.
- Flat-bath DRI charging: better arc stability but lower arc voltage programs.

**Relevance to JSPL:** Strong literature basis that **higher DRI share often lengthens TTT** unless offset by HM, hot DRI, metallization, O₂/C practice.

---

### Memoli et al. (2015) — AusIMM / transient slag study
**Title:** Transient Slag Behaviour in DRI and Scrap Based EAF (high vs low grade DRI)

**Key findings:**
- DRI grade (gangue, C, metallization) affects flux, slag weight, C/O₂, feeding rates.
- Low-grade DRI needs more C/O₂ for foamy slag sustainment.
- Slag engineering: minimize volume while meeting de-P, foaming, MgO saturation.

**Relevance to JSPL:** DRI quality variables missing from current JSPL dataset — major gap.

---

### Duan, Zhang & Yang (2014) — *steel research international*
**Title:** Effect of Hot Metal Utilization on EAF Process Parameters

**Key findings:**
- HMR 41–75% in 150 t/ch furnace.
- HM reduces accumulated power consumption but **O₂ must increase** to hold TTT.
- Optimized O₂: ~0.45 min/t HM reduction in TTT across HMR range.
- Slag foaming developed above 6000–10000 Nm³/h O₂.

**Relevance to JSPL:** Explains `HM_X_POWER` and `OXYGEN_PER_TONNE` importance; HM effect is **conditional on oxygen**.

---

### Yang et al. (2023) — *Journal of Cleaner Production*
**Title:** Effect of Hot Metal Charging on Economic and Environmental Indices of EAF Steelmaking in China

**Key findings:**
- HM charging: faster melting, lower power consumption, **shorter TTT**, higher yield — at moderate HMR.
- Excessive HM can slow process when decarburization dominates (cites prior Chinese plant studies).

**Relevance to JSPL:** Supports HM as beneficial under coordinated O₂; nonlinear at high HMR.

---

## C. Oxygen, Carbon, Foamy Slag

### Morales et al. (2025) — *Minerals* 16(2):152
**Title:** Alternative Carbon Sources as Foaming Agents for EAF Slags (review)

**Key findings:**
- Arc efficiency in refining strongly linked to slag foaming height.
- DRI/scrap ratio 80→98.2% with graphite injection improved foaming; energy 730→640 kWh/t in cited case.
- FeO from DRI drives CO generation with carbon; fixed carbon >70%, fine particles preferred.

**Relevance to JSPL:** Supports `BUCKET_X_CPC`, `CPC_X_DRI` interactions; carbon is not independent of DRI burden.

---

### Węglarz et al. (2024) — *Materials* 17(23):5860
**Title:** Improvement of Foaming Agent Feeding by Arc Sound and Power CV

**Key findings:**
- Automated foaming agent timing stabilizes arc, reduces power-on time, EE, and carbon use (industrial 70 t UHP EAF).
- Siemens FSM Manager: reduced power-on time and EE within weeks.

**Relevance to JSPL:** Foamy slag is **state variable** proxied by C/O₂; not in dataset.

---

### Aminorroaya / THD–viscosity study (cited in EAF arc stability literature)
**Key findings:**
- Optimum FeO band minimizes energy; foaming index linked to viscosity, basicity.
- THD reduction with better foam → lower electrical power in refining.

**Relevance to JSPL:** Mechanistic basis for O₂×C×slag interactions.

---

## D. Fluxes and Basicity

### Memoli et al. (2021) — slag basicity 1.8–2.1 (CaO/SiO₂)
- DRI gangue (SiO₂, Al₂O₃) forces higher lime/doloma → more slag volume → more melting energy.
- Doloma for MgO saturation and refractory protection.

### Kirschen et al. (2011)
- Acidic slag from DRI gangue increases O₂ and flux demand.

**JSPL note:** `DOLO_SQ` ranked unexpectedly high in SHAP (Phase 19) — may capture MgO/refractory practice or collinearity artifact; literature link to TTT is indirect via slag volume and foaming.

---

## E. Delays, Shift, Productivity

### Knutsen et al. (2020); Štore Steel (2019)
- Delay timing matters: preparation delay ≠ refining delay for energy loss.
- JSPL retains 299 long-delay heats (TTT outliers) — literature supports **two-stage modeling** (normal vs delay).

### CJCE (2025) — MGGP-GA for arcing time on DRI-based EAF
- 8692 heats; symbolic models for **arcing time** (not full TTT).
- GA reduced arcing time 1.45 min, energy 4%, productivity +3.54%.
- Validates ML on arcing time with burden/O₂/voltage features.

---

## F. Feature Engineering for Energy Efficiency

### Hein et al. (2025) — *Metals* 15(1):13
**Title:** Feature Engineering to Embed Process Knowledge: Analyzing Energy Efficiency of EAF Steelmaking

**Key findings:**
- 80% DRI / 20% scrap plant; median DRI ~83.2% metallic Fe.
- Physics-inspired features (slag volume, total carbon, tap temp, **tap-to-tap per minute**) improved interpretability.
- Fitted TTT coefficient +0.37 kWh/t·min (p<1e-8) for SEC model.

**Relevance to JSPL:** Template for Phase 24 physics-guided features; separates SEC modeling from TTT modeling.

---

## G. Equipment Vendor Technical Sources (non-peer-reviewed, cross-check only)

| Source | Claim | Use in Phase 23 |
|--------|-------|-----------------|
| Primetals EAF Quantum | TTT ~33 min with scrap preheat + FAST tapping | Upper bound benchmark |
| Midrex DRI value article | Metallization 92–96%; carbon for foamy slag | Supports Kirschen (2011) |
| Danieli / Tenova / SMS | Power control, chemical energy packages | Constraint taxonomy only |

---

## H. Paper Index (Quick Reference)

| ID | Authors | Year | Journal | Topic |
|----|---------|------|---------|-------|
| L1 | Knutsen et al. | 2020 | Metals | EE vs TTT sub-processes |
| L2 | Sjunnesson et al. | 2019 | Metals | EE modeling review, causality |
| L3 | Kirschen et al. | 2011 | Energy | DRI energy balance, metallization |
| L4 | Memoli et al. | 2021 | Processes | DRI slag, TTT comparison |
| L5 | Duan et al. | 2014 | steel research int | HM ratio, O₂, TTT |
| L6 | Yang et al. | 2023 | J Clean Prod | HM environmental/economic |
| L7 | Morales et al. | 2025 | Minerals | Carbon foaming agents |
| L8 | Węglarz et al. | 2024 | Materials | Foaming control, power-on |
| L9 | Pfeifer et al. | 2021 | Metals | 5-furnace EE models |
| L10 | Kovačič et al. | 2019 | Energies | Delays vs EE |
| L11 | Hein et al. | 2025 | Metals | Physics feature engineering |
| L12 | CJCE MGGP-GA | 2025 | Can J Chem Eng | Arcing time optimization |
| L13 | Memoli transient | 2015 | AusIMM | DRI grade, slag dynamics |

---

*Phase 23 — research only. No model retraining performed.*
