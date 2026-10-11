# Run the first trial

1. Run `python prepare_experiment.py`. It writes the synthetic fixture, two ready-to-paste prompts and context byte counts into experiment-001/.
2. Open a fresh chat in your chosen coding tool with repository access disabled, and paste prompt-A.md. Record the exact model and settings.
3. Save the returned patch and the tool's actual usage report. If usage is not exposed, mark it unknown.
4. Open another fresh chat with the same model/settings and paste prompt-B.md.
5. Save that patch and usage report too. Include correction turns in the totals.
6. Apply each patch to a separate copy of the fixture. Verify empty input = 0; the supplied example = 46; price 1.5 and quantity 2 = 3; frozen input remains unchanged; exports and signatures stay unchanged.
7. Fill RESULTS.md with both runs. These two runs are a pilot, not evidence of general savings. Complete at least three paired trials before summarizing results.

This repository does not currently run a model or collect account usage automatically. The context metrics are reproducible local measurements; they are not model token counts.
