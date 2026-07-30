# Recipes

These scripts are opt-in examples for common API patterns. They reuse the
starter's validation but remain outside default workflows because they require
target-specific contracts.

## OAuth client credentials

The recipe retrieves the client ID and secret from `k6/secrets`, exchanges
them for an access token, then calls `BASE_URL`. Both URLs must use HTTPS;
loopback HTTP is allowed for local development. Redirects are disabled so
credentials cannot be forwarded to an unexpected target.

```bash
k6 run \
  --secret-source=file=.env.k6-secrets \
  -e BASE_URL=https://api.example.com/protected \
  -e TOKEN_URL=https://auth.example.com/oauth/token \
  -e OAUTH_CLIENT_ID_SECRET=oauth-client-id \
  -e OAUTH_CLIENT_SECRET_SECRET=oauth-client-secret \
  recipes/oauth-client-credentials.ts
```

The example uses `client_secret_post`. Adapt the token request only when the
provider requires a different standard client-authentication method.

## GraphQL

The recipe sends a bounded `query Health { __typename }` operation and fails
when the response has a non-200 status or a non-empty `errors` array.

```bash
BASE_URL=https://api.example.com \
GRAPHQL_PATH=/graphql \
k6 run recipes/graphql.ts
```

## File upload

The upload recipe sends the bundled small fixture as multipart form data. It
does not accept an arbitrary local file path.

```bash
BASE_URL=https://api.example.com \
UPLOAD_PATH=/upload \
UPLOAD_EXPECTED_STATUS=201 \
k6 run recipes/file-upload.ts
```

Run recipes only against systems you own or are authorized to test. Replace
the example thresholds with the target's actual performance objectives.
