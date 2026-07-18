# Waypoint Volunteer — Recommendation Engine

Two complementary layers answer *What good can I do today?* without guilt or gamification.

---

## 1. Today insights (`today-engine.js`)

**Pipeline**

1. Context — weather (Open-Meteo), season, daylight, location, user prefs  
2. Declarative rules — hopeful / practical / seasonal messages  
3. Soft scorer — gentle list ranking (scores are **not** shown as points)  
4. Presenter — top calm messages in the Today strip  
5. `registerInsightSource()` — future AI or external sources

Rules never invent urgency. Failures degrade to browsing.

---

## 2. “Today I can…” (`today-i-can.js`)

Prompt-based recommendations over **placeholder/demo data**, with **explicit reasoning**.

### Example prompts

- “I have 30 minutes.”  
- “I want to help wildlife.”  
- “I'd rather stay indoors.”  
- “I have children with me.”  
- “I'm looking for something near a park.”  
- “I want to try citizen science.”  
- “I need something gentle today.”  
- “I'd like to be outdoors.”

### Inputs considered

Weather · season · time available · interests / facets · distance · physical effort · day of week

### Output shape

```text
{
  prompt,
  message,
  results: [
    { opportunity, score, reasons: string[] }
  ]
}
```

Reasons are human-readable (“Fits about 45 minutes…”, “Indoor/remote options can be easier when rain is around.”).  
Every result also reminds that impact is local and modest.

Scores are internal only — never displayed as points, ranks, or streaks.

---

## Honesty rules

- Do not exaggerate impact.  
- Prefer indoor/remote when rain or heat makes outdoor work harder — as a kindness, not a command.  
- If nothing matches, say so and invite free browsing.  
- No FOMO copy.

---

## Future AI

An optional insight source may plug into `VolunteerTodayEngine.registerInsightSource`.  
AI must remain:

- Optional  
- Explainable (surface reasons)  
- Non-guilt  
- Secondary to user agency
