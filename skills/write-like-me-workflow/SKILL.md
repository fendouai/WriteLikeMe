---
name: write-like-me-workflow
description: End-to-end writing agent workflow for turning one URL, text excerpt, product note, news item, GitHub repo, or rough idea into audience-aware content that sounds like the author. Use when the user asks to write like them, build a content workflow, research real users, create X threads, generate angles, adapt content to platforms, score drafts, optimize drafts, or produce multiple versions from sparse input.
---

# Write Like Me Workflow

## Overview

Use this skill as a research-first writing agent. The job is not to summarize source material; it is to understand the reader, the content, the unmet demand, and the author's voice, then produce scored and improved content.

If the user only provides one URL or one text block, proceed. Use web search to fill gaps unless the user explicitly says not to browse. Ask questions only when the missing information would materially change the output and cannot be reasonably inferred.

## Workflow

1. **Ingest the seed**
   - Accept a URL, pasted text, product note, repo, news item, or rough idea.
   - If a URL is provided, open/read the page and capture title, author/source, publish date if visible, central claims, evidence, and outbound references.
   - If text is provided, extract the topic, claims, implied audience, named entities, unfamiliar terms, and possible controversy.

2. **Understand real users**
   - Build a provisional user persona from the seed.
   - Search for concrete user evidence. Prefer Reddit, Hacker News, GitHub issues/discussions, Product Hunt comments, X posts, YouTube comments, forums, review sites, and niche communities.
   - Identify at least 3 real-user signals when possible: complaint, question, workaround, buying trigger, objection, or desired outcome.
   - Include source links or search queries used. Do not invent real people or quotes.

3. **Build the content knowledge base**
   - Search related material: official docs/pages, competing products, announcements, expert commentary, market context, and definitions.
   - Separate verified facts from inference.
   - Note what must be cited, what is uncertain, and what should be avoided.

4. **Map demand and cognition**
   - State what the audience already knows.
   - State what they likely misunderstand or have not connected yet.
   - State the practical, emotional, and social need the content can satisfy.
   - Turn this into a writing brief: reader, problem, promise, proof, desired reaction.

5. **Understand the author**
   - Ask for past writing samples, tags, a short self-profile, or target author examples if none are present.
   - If the user provides nothing, infer a temporary style from the current request and label it as provisional.
   - Create a Writing Style Fingerprint: tone, sentence rhythm, vocabulary, viewpoint pattern, structure, forbidden phrases, example line.

6. **Generate angles**
   - Produce exactly 5 angles:
     1. Contrarian
     2. Startup/opportunity
     3. Tool/practical recommendation
     4. Trend judgment
     5. Debate/question
   - For each angle, include headline, hook, why the target user cares, and evidence needed.

7. **Draft**
   - Select the best angle yourself if the user has not selected one.
   - Generate an X thread first.
   - Apply the Writing Style Fingerprint.
   - Keep claims grounded in the knowledge base.

8. **Score and optimize**
   - Score: Hook strength, information density, novelty, style match, AI-smell risk, platform fit, credibility, share/comment potential.
   - Revise 1-3 rounds internally before final output.
   - Output 3 versions:
     - Version A: safe/professional
     - Version B: sharper/more controversial
     - Version C: closest to author voice

## Output Shape

Use concise headings:

- Research Dossier
- Writing Brief
- Style Fingerprint
- Five Angles
- Selected Angle
- X Thread Versions
- Scorecard
- Optimization Notes
- Missing Evidence / Suggested Searches

When citations matter, include source links. When evidence is inferred, label it as inference.
