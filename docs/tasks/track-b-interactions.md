# Track B: Drug interaction dataset and checker

Branch: `feat/<name>-interactions`

## Goal

Implement `POST /interactions/check` as defined in `packages/shared/openapi.yaml`
(`InteractionCheckRequest`, `InteractionCheckResult`, `InteractionWarning`), using a
small curated local dataset. This is safety-critical: **no warning may exist without
a checkable source**, and the checker must never produce warnings that aren't in the dataset.

## Files you may change

- `services/api/app/interactions/` (dataset files and code)
- `services/api/app/routers/interactions.py`
- `services/api/tests/test_interactions_*.py`

Nothing else.

## Dataset

Store it as YAML or JSON in `app/interactions/data/`, with a `DATASET_VERSION` string.

1. Medications: 20–30 medications commonly used in Hong Kong. Include OTC products
   people take without thinking, such as paracetamol brands (Panadol), ibuprofen,
   cold and flu combination products, antihistamines, and common chronic medicines
   (e.g. warfarin, aspirin, metformin, amlodipine, simvastatin).
   - Each entry has an `id`, `names` (generic plus common HK brand names, English and
     Traditional Chinese where known), and `ingredients` (a list of active ingredients).
2. Interactions: pairs of ingredients with `severity` (`major` / `moderate` / `minor`),
   a `summary` in plain English (add `zhHant` only if you are confident), and
   `sources` (at least one).
3. Sources must be real and checkable: a drug label (e.g. DailyMed/FDA), a national
   formulary, or the HK Department of Health Drug Office. Include the URL.
   - If you cannot cite a real source for an entry, leave the entry out.
   - Never invent a URL or a citation.
4. Mark every entry `reviewed: false`. A human will verify each one and flip it to
   `true`. List all entries in the PR description for review.

Summaries describe the risk and tell the user to check with a doctor or pharmacist.
They never tell the user to stop or change a medication, and never diagnose.

## Checker

- Match input names to medications case-insensitively, ignoring surrounding whitespace.
  Match on any name in `names`. Keep the matching simple and predictable; no fuzzy matching.
- `duplicate_ingredient`: two or more inputs share an active ingredient
  (e.g. Panadol + a cold medicine containing paracetamol). Set `ingredient`.
  Use severity `major` for paracetamol (overdose risk) and `moderate` otherwise, and
  cite a source for the duplicate risk as well.
- `interaction`: any pair of inputs whose ingredients form a pair in the dataset.
- `medications` in each warning lists the input names exactly as the user gave them.
- Names that don't match are returned in `unrecognized`, in input order.
- The same input twice doesn't create a warning against itself.
- The result is deterministic: sort warnings by severity (major first), then by names.

## Tests (all offline)

- Dataset integrity: every entry has ≥1 source with a title, every interaction
  references known ingredients, IDs are unique, and there are no duplicate pairs.
- Duplicate ingredient: Panadol + a paracetamol combination product → one
  `duplicate_ingredient` warning naming paracetamol.
- Known interaction pair → one `interaction` warning with sources.
- An unknown name goes to `unrecognized` and produces no warning.
- Case and whitespace insensitivity; the same input repeated.
- Route: `POST /interactions/check` returns camelCase JSON matching the contract. An
  empty `medications` list → 422.

## Out of scope

LLM explanations of warnings, fuzzy name matching, dosage checks, and the frontend.

## Done when

- `ruff check .`, `ruff format --check .` and `pytest` pass in `services/api`.
- The PR description contains the full list of dataset entries with their sources,
  so a human can review them.
