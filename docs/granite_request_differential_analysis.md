# Granite Request Differential Analysis

## 1. Endpoint comparison

| Aspect | Current value | Identical between smoke test & GraniteProvider? |
|---|---|---|
| HTTP method | `POST` | YES |
| Full path | `/ml/v1/text/chat?version=2024-05-01` | YES |
| Code path | `GraniteProvider.generate()` — same code | YES |

## 2. Payload

```json
{
  "model_id": "ibm/granite-4-h-small",
  "messages": [
    {"role": "system", "content": "You are a test agent."},
    {"role": "user", "content": "Reply with exactly: GRANITE ONLINE"}
  ],
  "space_id": "1fc02a8a-e940-447c-8300-6b047daa31f5"
}
```

The smoke test and `GraniteProvider.generate()` share identical code — the requests are byte-for-byte the same.

## 3. Headers

```
Authorization: Bearer eyJ...
Content-Type: application/json
```

Identical in both paths.

## 4. Full 403 response body

```json
{
  "errors": [
    {
      "code": "token_quota_reached",
      "message": "Request of 1 token(s) from quota was rejected",
      "more_info": "https://cloud.ibm.com/apidocs/watsonx-ai#text-chat"
    }
  ],
  "trace": "fd2a6d161de675ec153244abf52f55db",
  "status_code": 403
}
```

## 5. Additional tests (diagnostic)

| variant | endpoint | body key | result |
|---|---|---|---|
| Current | `/ml/v1/text/chat` | `space_id` | **403 `token_quota_reached`** |
| project_id | `/ml/v1/text/chat` | `project_id` | 404 `container_not_found` |
| generation + space_id | `/ml/v1/text/generation` | `space_id` | 403 `token_quota_reached` |
| generation + project_id | `/ml/v1/text/generation` | `project_id` | 404 `container_not_found` |
| v2 chat | `/ml/v2/text/chat` | `project_id` | 404 (nginx) |

These confirm:
- `1fc02a8a-e940-447c-8300-6b047daa31f5` is a **space** (not a project)
- `/ml/v1/text/chat` is the correct endpoint
- `space_id` is the correct payload key
- API version `2024-05-01` is valid

## 6. Root cause

**`token_quota_reached`** — the IBM API key's token quota has been exhausted.

This is NOT:
- A configuration loading issue (values are correct)
- An endpoint issue (path, version, method are correct)
- A payload issue (model_id, messages, space_id are correct)
- An IAM auth issue (token is obtained successfully)
- A difference between smoke test and GraniteProvider (they use the same code)

## 7. Verdict

**Are the smoke test request and GraniteProvider request identical?** — **YES.** Zero code difference. The 403 is purely a quota limitation on the IBM API key.

## 8. Recommended fix

Provision additional tokens or increase the quota limit for the API key `2gC4OfHxByI3xzAwc0...` at the IBM Cloud console. No code changes required.
