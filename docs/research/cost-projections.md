# Daytona Cost Projections

Cost estimates for Ralph-GAS with a team of 10 developers.

---

## Daytona Pricing (Official)

Source: https://www.daytona.io/pricing

| Resource | Per Hour    | Per Second     |
| -------- | ----------- | -------------- |
| vCPU     | $0.0504/h   | $0.00001400/s  |
| Memory   | $0.0162/GiB | $0.00000450/s  |
| Storage  | $0.000108/h | $0.00000003/s  |

**Free tier**: $200 in compute credits
**Startups**: Up to $50k in credits available

---

## Ralph-GAS Sandbox Profile

Current sandbox configuration:

| Resource | Amount | Cost/hour |
| -------- | ------ | --------- |
| vCPU     | 1      | $0.0504   |
| Memory   | 1 GiB  | $0.0162   |
| Storage  | 3 GiB  | $0.000324 |
| **Total**|        | **$0.067/hour** |

Per task (~2 minutes active):
- **$0.0022/task** (sandbox compute only)

---

## Team of 10: Usage Scenarios

### Conservative (Light adoption)

- 2 tasks/dev/day
- 20 working days/month
- **400 tasks/month**

| Metric | Value |
| ------ | ----- |
| Sandbox hours | 13.3 hrs |
| **Monthly cost** | **~$0.90** |
| Per developer | $0.09/month |

### Moderate (Regular use)

- 5 tasks/dev/day
- 20 working days/month
- **1,000 tasks/month**

| Metric | Value |
| ------ | ----- |
| Sandbox hours | 33.3 hrs |
| **Monthly cost** | **~$2.23** |
| Per developer | $0.22/month |

### Heavy (Full adoption)

- 10 tasks/dev/day
- 20 working days/month
- **2,000 tasks/month**

| Metric | Value |
| ------ | ----- |
| Sandbox hours | 66.7 hrs |
| **Monthly cost** | **~$4.47** |
| Per developer | $0.45/month |

---

## Annual Projections

| Scenario     | Monthly | Annual   |
| ------------ | ------- | -------- |
| Conservative | $0.90   | ~$11     |
| Moderate     | $2.23   | ~$27     |
| Heavy        | $4.47   | ~$54     |

---

## Free Tier Coverage

With $200 free credits:

| Scenario     | Tasks covered | Duration at pace |
| ------------ | ------------- | ---------------- |
| Conservative | ~90,000 tasks | ~18 years        |
| Moderate     | ~90,000 tasks | ~7.5 years       |
| Heavy        | ~90,000 tasks | ~3.75 years      |

**Bottom line**: Free tier is extremely generous for this use case.

---

## Cost Comparison

Daytona vs running equivalent on cloud:

| Provider     | 1 vCPU + 1GB/hour | Notes |
| ------------ | ----------------- | ----- |
| **Daytona**  | $0.067            | Pay per second, instant startup |
| AWS EC2 t3   | ~$0.0104          | Need to manage, slower startup |
| GCP e2-micro | ~$0.0076          | Need to manage, slower startup |

Daytona is ~6-8x more expensive per hour BUT:
- Sub-90ms sandbox creation
- No infrastructure management
- Pay only for active time (per-second billing)
- Isolated secure environments

For short-lived tasks (2-5 min), the premium is worth it.

---

## Tier Limits (Current: Preview)

Your current tier limits:

| Resource           | Limit  |
| ------------------ | ------ |
| Compute (vCPU)     | 10     |
| Memory (GiB)       | 20     |
| Storage (GiB)      | 30     |
| API Requests/min   | 10,000 |
| Sandbox Creation/min | 300  |

**Concurrent sandboxes**: ~10 (with 1 vCPU each)

For 10 developers running sequentially: no issues.
For 10 developers running in parallel: at limit.

---

## Recommendations

1. **Start with free tier** - $200 covers extensive testing
2. **Apply for startup credits** if scaling up ($50k available)
3. **Tier upgrade** only needed for:
   - Custom snapshot creation
   - Full internet access in sandboxes
   - Higher concurrent limits
4. **Cost is negligible** compared to developer time saved

---

## Notes

- Prices verified from daytona.io/pricing (Jan 2025)
- Does not include Anthropic API costs for Claude
- Storage pricing assumes 5GB free tier used
- Actual costs may vary with task complexity and duration
