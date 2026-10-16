name: Bug Report
description: File a bug report for Griot
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: Thanks for reporting an issue in Griot!
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of the bug.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Exact steps to reproduce the behavior.
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment Info
      description: Node version, OS, AWS Bedrock region.
    validations:
      required: true
