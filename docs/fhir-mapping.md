# Flare → FHIR R4 Resource Mapping

A design reference mapping Flare's data models to FHIR R4 resources for future healthcare interoperability.

## Mapping Summary

| Flare Table | FHIR Resource | Notes |
|---|---|---|
| `auth.users` | `Patient` | Core identity |
| `symptom_logs` | `Observation` | category: `survey` |
| `symptom_types` | `CodeSystem` / SNOMED CT | Custom + standard codes |
| `symptom_categories` | `ValueSet` | Groupings of symptom codes |
| `body_locations` | `Observation.bodySite` | Coded via SNOMED CT body site |
| `medications` | `MedicationStatement` | Active/historical med list |
| `medication_logs` | `MedicationAdministration` | Per-dose adherence |
| `practices` | `CarePlan.activity` | Health commitments |
| `practice_completions` | `Procedure` | Completed health activities |
| `metrics` | `Observation` | category: `vital-signs` or `activity` |
| `metric_types` | `ObservationDefinition` | Units, targets, scales |
| `practice_symptoms` | `CarePlan.addresses` | Links practice → condition |
| `medication_symptoms` | `MedicationStatement.reasonReference` | Links med → condition |

## Detailed Mappings

### 1. auth.users → Patient

```json
{
  "resourceType": "Patient",
  "id":          "users.id",
  "identifier":  [{ "system": "urn:flare:user", "value": "users.id" }],
  "telecom":     [{ "system": "email", "value": "users.email" }],
  "active":      true
}
```

Minimal mapping — Flare intentionally collects very little PII. FHIR Patient supports richer demographics but Flare only needs the identifier for resource linkage.

### 2. symptom_logs → Observation

Each symptom log becomes an Observation with severity and optional body site.

```json
{
  "resourceType": "Observation",
  "id":            "symptom_logs.id",
  "status":        "final",
  "category":      [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "survey" }] }],
  "code":          "→ mapped from symptom_type_id (see Coding Strategy)",
  "subject":       { "reference": "Patient/user_id" },
  "effectivePeriod": {
    "start":       "symptom_logs.started_at",
    "end":         "started_at + duration_minutes (if not null)"
  },
  "valueInteger":  "symptom_logs.severity (0-10)",
  "bodySite":      "→ mapped from location_id (SNOMED CT body site code)",
  "note":          [{ "text": "symptom_logs.notes" }]
}
```

**Key decisions:**
- `severity` maps to `valueInteger` with a 0–10 numeric pain scale
- `bodySite` uses SNOMED CT codes (requires a Flare → SNOMED mapping table)
- Ongoing symptoms (null duration) use `effectiveDateTime` instead of `effectivePeriod`
- `metadata` JSONB → FHIR extensions for custom fields

### 3. symptom_types + symptom_categories → CodeSystem + ValueSet

Flare's 150+ predefined symptoms form a custom CodeSystem. For interoperability, each should also map to a SNOMED CT code where possible.

```json
{
  "resourceType": "CodeSystem",
  "url":           "urn:flare:symptom-types",
  "name":          "FlareSymptomTypes",
  "concept": [
    { "code": "symptom_type.id", "display": "symptom_type.name",
      "property": [{ "code": "category", "valueString": "category.name" }] }
  ]
}
```

**SNOMED CT mapping examples:**

| Flare Symptom | SNOMED CT Code | SNOMED Display |
|---|---|---|
| Migraine | 37796009 | Migraine |
| Brain fog | 736322002 | Cognitive dysfunction |
| Fatigue | 84229001 | Fatigue |
| Insomnia | 193462001 | Insomnia |
| Joint pain | 57676002 | Joint pain |
| Anxiety | 48694002 | Anxiety |
| Nausea | 422587007 | Nausea |

A full SNOMED mapping for all 150+ symptoms would be a dedicated effort, but the hierarchical category structure (Physical > Pain > Head & Face) maps well to SNOMED's hierarchy.

### 4. body_locations → SNOMED CT Body Site Codes

Flare's ~60 body locations map directly to SNOMED CT body structure codes for use in `Observation.bodySite`.

| Flare Location (region) | SNOMED CT Code | SNOMED Display |
|---|---|---|
| Forehead (Head/Face) | 52795006 | Forehead structure |
| Left knee (Legs) | 82169009 | Left knee structure |
| Lower back (Back) | 37822005 | Lumbar spine structure |
| Chest, left (Chest) | 63516007 | Left chest wall |

### 5. medications → MedicationStatement

```json
{
  "resourceType": "MedicationStatement",
  "id":               "medications.id",
  "status":           "active | stopped",
  "medicationCodeableConcept": {
    "text":           "medications.name",
    "coding":         "→ RxNorm code if mappable (future)"
  },
  "subject":          { "reference": "Patient/user_id" },
  "effectivePeriod": {
    "start":          "medications.started_at",
    "end":            "medications.ended_at"
  },
  "dosage": [{
    "text":           "medications.dosage",
    "timing":         "→ parsed from medications.frequency + reminder_times"
  }],
  "reasonReference":  "→ Condition resources (from medication_symptoms)",
  "note":             [{ "text": "medications.notes" }]
}
```

**Key decisions:**
- `is_supplement` → FHIR category extension or MedicationStatement.category
- `dosage` is free-text in Flare — structured FHIR dosage would require parsing
- RxNorm coding would enable medication interaction checking (future value)

### 6. medication_logs → MedicationAdministration

```json
{
  "resourceType": "MedicationAdministration",
  "id":              "medication_logs.id",
  "status":          "completed | not-done",
  "medicationReference": { "reference": "MedicationStatement/medication_id" },
  "subject":         { "reference": "Patient/user_id" },
  "effectiveDateTime": "medication_logs.taken_at",
  "note":            [{ "text": "medication_logs.notes" }]
}
```

Clean 1:1 mapping. `taken: false` → `status: "not-done"` captures skipped doses — valuable for adherence reporting.

### 7. practices → CarePlan.activity

Health practices map to activities within a user's care plan.

```json
{
  "resourceType": "CarePlan",
  "id":           "generated per user",
  "status":       "active",
  "subject":      { "reference": "Patient/user_id" },
  "addresses":    "→ Condition references (from practice_symptoms)",
  "activity": [{
    "detail": {
      "kind":          "Task",
      "code":          { "text": "practice.name" },
      "status":        "scheduled | stopped",
      "scheduledTiming": {
        "repeat": {
          "frequency":   "practice.target_frequency",
          "period":      1,
          "periodUnit":  "d | wk",
          "dayOfWeek":   "practice.frequency_details.days"
        }
      },
      "description":   "practice.notes"
    }
  }]
}
```

### 8. practice_completions → Procedure

```json
{
  "resourceType": "Procedure",
  "id":            "practice_completions.id",
  "status":        "completed | not-done",
  "code":          { "text": "practice.name" },
  "subject":       { "reference": "Patient/user_id" },
  "performedDateTime": "practice_completions.completed_at",
  "note":          [{ "text": "practice_completions.notes" }],
  "basedOn":       [{ "reference": "CarePlan/..." }]
}
```

### 9. metrics → Observation

Metrics share the Observation resource with symptom_logs but use different categories.

```json
{
  "resourceType": "Observation",
  "id":            "metrics.id",
  "status":        "final",
  "category":      "→ depends on metric_type (vital-signs, activity, sleep)",
  "code":          "→ LOINC code from metric_type_id",
  "subject":       { "reference": "Patient/user_id" },
  "effectiveDateTime": "metrics.recorded_at",
  "valueQuantity": {
    "value":       "metrics.value",
    "unit":        "metric_types.unit",
    "system":      "http://unitsofmeasure.org",
    "code":        "→ UCUM unit code"
  },
  "note":          [{ "text": "metrics.notes" }],
  "method":        { "text": "metrics.source" }
}
```

**LOINC code examples for metric_types:**

| Flare Metric | LOINC Code | FHIR Category |
|---|---|---|
| Sleep duration | 93832-4 | `sleep` |
| Body weight | 29463-7 | `vital-signs` |
| Blood pressure (systolic) | 8480-6 | `vital-signs` |
| Resting heart rate | 8867-4 | `vital-signs` |
| Body temperature | 8310-5 | `vital-signs` |
| Steps | 55423-8 | `activity` |
| Water intake | 74008-4 | `activity` |

### 10. Junction Tables → FHIR Relationship References

`practice_symptoms` and `medication_symptoms` encode "this treatment is intended to help this symptom." In FHIR:

- **practice_symptoms** → `CarePlan.addresses` references to `Condition` resources
- **medication_symptoms** → `MedicationStatement.reasonReference` to `Condition` resources

This requires generating FHIR `Condition` resources from symptom_types:

```json
{
  "resourceType": "Condition",
  "id":            "derived from symptom_type_id + user_id",
  "code":          "→ SNOMED CT code for the symptom type",
  "subject":       { "reference": "Patient/user_id" },
  "clinicalStatus": { "coding": [{ "code": "active" }] }
}
```

## Coding Strategy

| FHIR Terminology | Flare Use | Priority |
|---|---|---|
| SNOMED CT | Symptom types, body locations, conditions | High |
| LOINC | Metric types (vitals, measurements) | High |
| RxNorm | Medications | Medium |
| UCUM | Metric units | High |
| Custom (`urn:flare:*`) | User-created types, practice names | Required |

**Dual-coding approach:** Each Flare concept gets both a custom `urn:flare:*` code (guaranteed unique) and a standard terminology code where mappable. This ensures no data loss while maximizing interoperability.

## What This Enables

1. **FHIR Bundle Export** — Generate a `Bundle` of type `document` containing all resources for a date range, shareable with any FHIR-capable EHR
2. **SMART on FHIR Import** — Pull lab results, diagnoses, and prescriptions from a user's health system into Flare
3. **Apple Health / Google Health Connect** — Both platforms support FHIR R4, enabling bidirectional sync
4. **Clinical Decision Support** — Standard codes enable medication interaction checking and guideline matching
5. **Research Data Donation** — Users could contribute de-identified FHIR bundles to chronic illness research

## Architectural Recommendations

When ready to build FHIR support:

1. **Add a `standard_code` column** to `symptom_types`, `metric_types`, and `body_locations` to store SNOMED/LOINC/UCUM codes alongside internal UUIDs
2. **Build a FHIR serialization layer** — a module that converts Flare query results into FHIR JSON resources
3. **Start with export only** — read-only FHIR Bundle generation is far simpler than bidirectional sync
4. **Use established libraries** (HAPI FHIR, fhir.js) rather than hand-rolling FHIR serialization
5. **Consider a FHIR facade Edge Function** — a Supabase Edge Function that serves Flare data as a FHIR API endpoint
