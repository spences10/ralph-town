# Ralph Setup Guide

## Runtime Options

- **local**: Runs on host machine directly
  - Requires tsx installed globally
  - No isolation - changes affect local filesystem
  - Fastest startup

- **daytona**: Cloud sandboxes (recommended)
  - Full isolation per criterion
  - Pre-configured environment
  - Requires DAYTONA_API_KEY

- **devcontainer**: Local Docker container
  - Isolation via Docker
  - Uses project's devcontainer config
  - Requires Docker running

## Mode Options

- **sequential**: One criterion at a time
  - Single runtime instance
  - Lower resource usage
  - Easier to debug

- **parallel**: All criteria concurrently
  - Separate runtime per criterion
  - Faster overall completion
  - Higher resource/cost usage
  - Each criterion gets its own git branch

## Model Selection

- **haiku** (default): Cheap and fast
  - Reasoning done upfront when creating ralph.json
  - Sandbox agents just execute steps
  - Best cost/performance ratio

- **sonnet**: Mid-tier
  - More capable reasoning
  - Use if tasks require complex decisions

- **opus**: Most capable
  - Highest cost
  - Only for very complex tasks

## Cost Considerations

parallel + sonnet + 5 criteria + 3 iterations each = expensive

Recommended: haiku for most cases
