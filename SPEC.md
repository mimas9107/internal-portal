---
name:          "SPEC.md"
description:   "Technical specification and requirements."
created_date:  "2026/06/18 10:00:00"
modified_date: "2026/06/18 10:00:00"
project_version: "1.1.0"
document_version: "1.0.0"
agent_sign: ['gemini cli/current_agent']
---

# Technical Specification

## Core Requirements
- Node.js environment.
- Express framework for web routing.
- EJS for template rendering.
- TCP socket scanning for device status.
- External configuration via `servers.list`.

## API Endpoints
- `GET /api/service/:name`: Returns JSON status of a specific service.
