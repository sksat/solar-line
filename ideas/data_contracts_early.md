# Define Data Contracts Early

From Codex consultation: Define the JSON schemas for subtitle data and analysis results
early in the project, before building the collection scripts or report pipeline.
This prevents later tasks from having to rework their I/O formats.

Schemas needed:
- Subtitle data: timestamps, speaker, language, source URL, content hash
- Analysis result: episode, transfer description, claimed ΔV, computed ΔV, assumptions, verdict
