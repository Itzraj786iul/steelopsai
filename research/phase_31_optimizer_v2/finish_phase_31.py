"""Finish Phase 31 deliverables after comparison CSV exists."""
import pandas as pd
from phase_31_pipeline import make_plots, write_phase32_recommendations, PLOTS

comp_df = pd.read_csv("optimizer_comparison.csv")
rec_df = pd.read_csv("recommendation_summary.csv")
sens_df = pd.read_csv("sensitivity_analysis.csv")
rob_df = pd.read_csv("robustness_analysis.csv")
make_plots(comp_df, sens_df, rob_df, rec_df)
comp_df.to_excel("optimizer_validation.xlsx", index=False)
write_phase32_recommendations(comp_df)
print(comp_df[["Heat", "V2_Saving_min", "V20_Acceptance", "Feasibility_Winner"]])
print("plots:", [p.name for p in PLOTS.glob("*.png")])
