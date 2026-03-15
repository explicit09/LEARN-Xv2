# Design Files

Two Paper.design files are the canonical source for all visual design and architecture diagrams in LEARN-X.

---

## Files

### LEARN-X — UI Designs
**URL:** https://app.paper.design/file/01KKNJ7304493HFTR1K1N1NF9Z

All app screens and component designs. Reference this before implementing any page, layout, or UI component.

### LEARN-X Architecture — Architecture Diagrams
**URL:** https://app.paper.design/file/01KKQW93XBGNEJ71527ADGGWN0?page=01KKR6ZAA219C4FX442GP097W8

System architecture overviews, pipeline diagrams, flowcharts, and tech stack maps. Reference this when making infrastructure or pipeline decisions.

Contains 9 artboards:
- 01 — System Architecture Overview
- 02 — Document Ingestion Pipeline
- 03 — Query / Chat Pipeline
- 04 — Tech Stack Map
- 05 — Personalization Engine
- 06 — Flowchart: Document Processing
- 07 — Flowchart: Chat Request
- 08 — Flowchart: Lesson Generation
- 09 — Syllabus System

---

## Accessing the Files

### Via Playwright (screenshots, visual inspection)

Both files are pre-logged-in in the Playwright browser:

```
Tab 0 → LEARN-X (UI designs)
Tab 1 → LEARN-X Architecture
```

Switch tabs with:
```typescript
// Switch to UI designs
browser_tabs({ action: 'select', index: 0 })

// Switch to Architecture
browser_tabs({ action: 'select', index: 1 })
```

Then take a screenshot to view the canvas.

### Via Paper MCP (read/write design nodes)

The Paper MCP connects to whichever file is focused in the Paper desktop app. Switching requires clicking the target file in the Paper window to bring it into focus.

- **Default focused file:** LEARN-X Architecture
- **To access LEARN-X UI designs:** click the LEARN-X file in Paper, then use MCP tools

---

## When to Reference Each File

| Situation | File to check |
|-----------|--------------|
| Implementing a new page or route | LEARN-X |
| Building a UI component | LEARN-X |
| Changing a pipeline or job | LEARN-X Architecture |
| Making an infrastructure decision | LEARN-X Architecture |
| Designing a new feature (both visuals + architecture) | Both |
