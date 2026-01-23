#!/bin/bash
# Ralph Discovery Script
# Runs discovery agent in Daytona sandbox

REPO_URL="${1:-}"
OUTPUT_FILE="${2:-.ralph-discovery.json}"

if [ -z "$REPO_URL" ]; then
    echo "Usage: discover.sh <repo-url> [output-file]"
    echo ""
    echo "Examples:"
    echo "  discover.sh https://github.com/user/repo.git"
    echo "  discover.sh https://github.com/user/repo.git my-discovery.json"
    exit 1
fi

echo "Starting discovery for: $REPO_URL"
echo "Output: $OUTPUT_FILE"

# This would typically call the orchestrator in discovery mode
# For now, output usage instructions

cat << 'EOF'

To run discovery, use the orchestrator with a discovery config:

{
  "repository": {
    "url": "<repo-url>",
    "branch": "main"
  },
  "discovery": true,
  "output": ".ralph-discovery.json"
}

Or run manually in a sandbox:

1. Clone the repo
2. Run discovery commands (see references/discovery-prompts.md)
3. Output JSON to .ralph-discovery.json

EOF
