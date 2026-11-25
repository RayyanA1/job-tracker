# CV profile field guide

Copy `cv-profile.template.json` to `.cv-data/local/profile.json`, or open **CV Profile** in the CV Library to initialise it. Edit the private copy and reopen **CV Profile** to review the facts. The CV creator uses the same file.

## Identity and professional background

- `name`, `location`, `email`, `phone`, and `links` are text. Leave unused contact fields blank. The app fills contact details into the CV locally.
- `headlines` lists the accurate titles or specialties Gemini can choose from for a job. Add at least one before generating a CV.
- `background` holds your factual professional summary. `interests` describes the domains, problems, or technologies you want to work on.

## Career facts

Each entry has a unique `id`, a `name` and a `kind`. Use lowercase letters, digits and hyphens in IDs. The app reserves `background` and `interests` for the matching profile fields. Keep IDs stable when editing entries so other entries can continue to refer to them.

| Kind          | Name                                                       | Fields and references                                                                                                                                       |
| ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`        | Employer                                                   | `Official title` and `Dates` required. Add `Scope` for team, product or responsibilities. List roles newest first.                                          |
| `achievement` | Short achievement label                                    | `Contribution` and a `roleId` required. Add an `Outcome`, exact `Metric`, and related `skills` when known.                                                  |
| `project`     | Project name                                               | `Contribution` required. Add a `roleId` for projects associated with a role. Add an `Outcome`, `Metric`, `Public link`, and related `skills` as applicable. |
| `skill`       | Technology or skill                                        | Use `evidence` to list supporting role, achievement or project IDs.                                                                                         |
| `education`   | Qualification, institution, dates and result if applicable | Put the details you want on a CV in the name.                                                                                                               |

Here is an example `entries` array. Replace the example content with your own facts.

```json
[
  {
    "id": "example-role",
    "kind": "role",
    "name": "Example Company",
    "fields": {
      "Official title": "Software Engineer",
      "Dates": "January 2022 to Present",
      "Scope": "Internal search platform"
    }
  },
  {
    "id": "search-latency",
    "kind": "achievement",
    "name": "Faster search",
    "roleId": "example-role",
    "fields": {
      "Contribution": "Reworked the search request cache.",
      "Outcome": "Reduced median response time.",
      "Metric": "15% lower median latency over one month."
    },
    "skills": ["typescript"]
  },
  {
    "id": "typescript",
    "kind": "skill",
    "name": "TypeScript",
    "evidence": ["search-latency"]
  }
]
```
