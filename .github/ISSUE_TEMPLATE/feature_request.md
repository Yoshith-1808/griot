name: Feature Request
description: Propose a new feature, tool, or integration for Griot
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: We welcome new MCP tools and voice experience enhancements!
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What voice interaction limitation are you addressing?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Proposed tool interface, prompt design, or architecture.
    validations:
      required: true
